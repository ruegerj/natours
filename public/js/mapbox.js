/* eslint-disable */
export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoicnVlZ2VyaiIsImEiOiJja3I0dnJvZXkyaTl0MnBueHA1aWtiMHJoIn0.Lplc8OLFT5ja4gkFFXG23Q';

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/ruegerj/ckr4xo1d70wbs18rsjxx5mit5',
    scrollZoom: false,
    doubleClickZoom: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((location) => {
    // Create marker element
    const element = document.createElement('div');
    element.className = 'marker';

    // Add marker
    const marker = new mapboxgl.Marker({
      anchor: 'bottom',
      element,
    });

    marker.setLngLat(location.coordinates);
    marker.addTo(map);

    // Add popup
    const popup = new mapboxgl.Popup({
      offset: 30,
      closeOnClick: false,
    });

    popup.setLngLat(location.coordinates);
    popup.setHTML(`<p>Day ${location.day}: ${location.description}</p>`);
    popup.addTo(map);

    // Extend map bounds to include the current location
    bounds.extend(location.coordinates);
  });

  // Adjust map based on the bounds
  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
