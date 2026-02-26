
export interface GeoJSONPoint {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Calculate the distance between two points using the Haversine formula.
 * @param point1 - First point in GeoJSON format [longitude, latitude]
 * @param point2 - Second point in GeoJSON format [longitude, latitude]
 * @returns Distance in kilometers
 */
export function calculateDistanceKm(point1: GeoJSONPoint, point2: GeoJSONPoint): number {
    const EARTH_RADIUS_KM = 6371;

    const [lon1, lat1] = point1.coordinates;
    const [lon2, lat2] = point2.coordinates;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
}

/**
 * Check if a point is within a given radius of another point.
 * @param center - Center point in GeoJSON format
 * @param target - Target point to check
 * @param radiusKm - Radius in kilometers
 * @returns true if target is within radiusKm of center
 */
export function isWithinRadius(
    center: GeoJSONPoint,
    target: GeoJSONPoint,
    radiusKm: number
): boolean {
    const distance = calculateDistanceKm(center, target);
    return distance <= radiusKm;
}

/**
 * Convert degrees to radians.
 */
function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}
