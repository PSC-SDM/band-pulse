/**
 * Script de mantenimiento: Detectar y limpiar follows duplicados
 * 
 * Problema: Usuarios pueden seguir múltiples artistas con el mismo Spotify ID
 * (diferentes MBIDs de MusicBrainz que representan el mismo artista)
 * 
 * Solución: Mantener solo el follow más reciente por Spotify ID
 */

import { getDatabase } from '../infrastructure/database/mongodb.connection';
import { logger } from '../shared/utils/logger';
import { ObjectId, Document } from 'mongodb';

interface DuplicateGroup {
    userId: string;
    spotifyId: string;
    artistName: string;
    follows: Array<{
        followId: ObjectId;
        artistId: ObjectId;
        artistName: string;
        followedAt: Date;
    }>;
}

async function findDuplicateFollows(): Promise<DuplicateGroup[]> {
    const db = getDatabase();

    // Obtener todos los follows con información del artista
    const pipeline = [
        {
            $lookup: {
                from: 'artists',
                localField: 'artistId',
                foreignField: '_id',
                as: 'artist'
            }
        },
        {
            $unwind: '$artist'
        },
        {
            $match: {
                'artist.externalIds.spotify': { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: {
                    userId: '$userId',
                    spotifyId: '$artist.externalIds.spotify'
                },
                follows: {
                    $push: {
                        followId: '$_id',
                        artistId: '$artistId',
                        artistName: '$artist.name',
                        followedAt: '$followedAt'
                    }
                },
                count: { $sum: 1 }
            }
        },
        {
            $match: {
                count: { $gt: 1 }
            }
        }
    ];

    const results = await db.collection('follows').aggregate(pipeline).toArray();

    return results.map((r: Document) => ({
        userId: r._id.userId.toString(),
        spotifyId: r._id.spotifyId,
        artistName: r.follows[0].artistName,
        follows: r.follows
    }));
}

async function deduplicateFollows(dryRun: boolean = true): Promise<void> {
    try {
        logger.info('Iniciando búsqueda de follows duplicados...');

        const duplicates = await findDuplicateFollows();

        if (duplicates.length === 0) {
            logger.info('✅ No se encontraron follows duplicados');
            return;
        }

        logger.info(`❗ Encontrados ${duplicates.length} grupos de duplicados`);

        const db = getDatabase();
        let totalDeleted = 0;

        for (const dup of duplicates) {
            logger.info(`\n👤 Usuario: ${dup.userId}`);
            logger.info(`🎵 Artista: ${dup.artistName} (Spotify: ${dup.spotifyId})`);
            logger.info(`📊 Follows duplicados: ${dup.follows.length}`);

            // Ordenar por fecha (más reciente primero)
            dup.follows.sort((a, b) => b.followedAt.getTime() - a.followedAt.getTime());

            // Mantener el más reciente, eliminar el resto
            const [keep, ...toDelete] = dup.follows;

            logger.info(`  ✓ Mantener: ${keep.artistName} (${keep.followedAt.toISOString()})`);

            for (const follow of toDelete) {
                logger.info(`  ✗ Eliminar: ${follow.artistName} (${follow.followedAt.toISOString()})`);

                if (!dryRun) {
                    const result = await db.collection('follows').deleteOne({
                        _id: follow.followId
                    });

                    if (result.deletedCount > 0) {
                        totalDeleted++;
                    }
                }
            }
        }

        if (dryRun) {
            logger.warn(`\n⚠️  DRY RUN - No se eliminaron registros`);
            logger.info(`📝 Ejecuta con --execute para aplicar cambios`);
        } else {
            logger.info(`\n✅ Eliminados ${totalDeleted} follows duplicados`);
        }

        // Resumen
        logger.info('\n📊 Resumen:');
        logger.info(`   - Grupos de duplicados: ${duplicates.length}`);
        logger.info(`   - Total follows a eliminar: ${duplicates.reduce((sum, d) => sum + d.follows.length - 1, 0)}`);

    } catch (error) {
        logger.error('Error durante deduplicación:', error);
        throw error;
    }
}

// Ejecutar script
const dryRun = !process.argv.includes('--execute');

if (dryRun) {
    console.log('🔍 Modo DRY RUN - Solo análisis, no se harán cambios\n');
} else {
    console.log('⚡ Modo EJECUCIÓN - Se aplicarán cambios\n');
}

deduplicateFollows(dryRun)
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error fatal:', error);
        process.exit(1);
    });
