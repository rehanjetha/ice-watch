const ROUTE_PROVIDERS = [
  {
    name: "FOSSGIS Foot",
    baseUrl: "https://routing.openstreetmap.de/routed-foot",
    routeProfile: "driving",
  },
  {
    name: "OSRM Demo",
    baseUrl: "https://router.project-osrm.org",
    routeProfile: "foot",
  },
];

async function fetchJson(url, timeout = 7000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function snapToNearestNetwork(provider, lat, lng) {
  const url = `${provider.baseUrl}/nearest/v1/${provider.routeProfile}/${lng},${lat}?number=1`;
  const data = await fetchJson(url, 5000);

  if (data.code !== "Ok" || !data.waypoints?.length) {
    throw new Error(`Nearest failed on ${provider.name}`);
  }

  const [snappedLng, snappedLat] = data.waypoints[0].location;
  return [snappedLat, snappedLng];
}

async function requestProviderRoute(provider, fromLat, fromLng, toLat, toLng) {
  const [snappedFrom, snappedTo] = await Promise.all([
    snapToNearestNetwork(provider, fromLat, fromLng).catch(() => [fromLat, fromLng]),
    snapToNearestNetwork(provider, toLat, toLng).catch(() => [toLat, toLng]),
  ]);

  const routeUrl = `${provider.baseUrl}/route/v1/${provider.routeProfile}/${snappedFrom[1]},${snappedFrom[0]};${snappedTo[1]},${snappedTo[0]}?overview=full&geometries=geojson&steps=true`;
  const data = await fetchJson(routeUrl);

  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(`Routing failed on ${provider.name}`);
  }

  const route = data.routes[0];
  const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

  return {
    coords,
    distance: route.distance,
    duration: route.duration,
    fallback: false,
    provider: provider.name,
    steps:
      route.legs?.flatMap((leg) =>
        (leg.steps || []).map((step) => ({
          instruction: step.maneuver?.type,
          name: step.name,
          distance: Math.round(step.distance),
        }))
      ) || [],
  };
}

function buildStraightLineFallback(fromLat, fromLng, toLat, toLng) {
  const R = 6371000;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const duration = distance / 1.4;

  return {
    coords: [
      [fromLat, fromLng],
      [toLat, toLng],
    ],
    distance,
    duration,
    fallback: true,
    provider: "Straight line fallback",
    steps: [],
  };
}

export async function fetchOSRMRoute(fromLat, fromLng, toLat, toLng) {
  for (const provider of ROUTE_PROVIDERS) {
    try {
      return await requestProviderRoute(provider, fromLat, fromLng, toLat, toLng);
    } catch {
      continue;
    }
  }

  return buildStraightLineFallback(fromLat, fromLng, toLat, toLng);
}
