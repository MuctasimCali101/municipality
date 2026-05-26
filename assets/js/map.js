/* ============================================================
   MUNICIPALITY — Land Digitizer Module
   Leaflet Map, Polygon Drawing, KML Export
   ============================================================ */

const DIGITIZER = (() => {
  let map = null;
  let points = [];
  let polygonLayer = null;
  let markers = [];
  let gpsMarker = null;
  let gpsAccuracy = null;
  let centerPoint = null;

  const CITY_COORDS = {
    bosaso: { lat: 11.2842, lng: 49.1816, zoom: 17 },
    garowe: { lat: 8.4056, lng: 48.4839, zoom: 17 },
    galkayo: { lat: 6.7697, lng: 47.4308, zoom: 17 },
    mogadishu: { lat: 2.0469, lng: 45.3182, zoom: 17 },
    hargeisa: { lat: 9.5600, lng: 44.0650, zoom: 17 },
    default: { lat: 11.2842, lng: 49.1816, zoom: 17 },
  };

  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function calculateArea(points) {
    if (points.length < 3) return 0;
    let area = 0;
    const n = points.length;
    const toRad = Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const x1 = points[i].lat * toRad;
      const y1 = points[i].lng * toRad;
      const x2 = points[j].lat * toRad;
      const y2 = points[j].lng * toRad;
      area += (y2 - y1) * (2 + Math.sin(x1) + Math.sin(x2));
    }
    area = Math.abs(area * 6371000 * 6371000 / 2);
    return area;
  }

  function calculatePerimeter(points) {
    if (points.length < 2) return 0;
    let perim = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      perim += haversine(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
    }
    return perim;
  }

  function updatePolygon() {
    if (polygonLayer) {
      map.removeLayer(polygonLayer);
      polygonLayer = null;
    }
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    if (points.length < 2) {
      updateInfo();
      return;
    }

    const latlngs = points.map(p => [p.lat, p.lng]);

    if (points.length >= 3) {
      polygonLayer = L.polygon(latlngs, {
        color: '#00c896',
        fillColor: '#00c896',
        fillOpacity: 0.18,
        weight: 2,
      }).addTo(map);
    }

    points.forEach((p, i) => {
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 6,
        color: '#00c896',
        fillColor: '#0a1628',
        fillOpacity: 1,
        weight: 2,
      }).addTo(map);
      marker.bindTooltip(`${i + 1}`, { permanent: true, direction: 'top', className: 'point-label' });
      markers.push(marker);
    });

    if (points.length >= 2) {
      const line = L.polyline(latlngs, {
        color: '#00c896',
        weight: 2,
        opacity: 0.6,
        dashArray: '5, 8',
      }).addTo(map);
      markers.push(line);
    }

    updateInfo();
  }

  function updateInfo() {
    const areaEl = document.getElementById('digitizedArea');
    const perimEl = document.getElementById('digitizedPerimeter');
    const pointCountEl = document.getElementById('pointCount');

    if (areaEl) {
      const area = calculateArea(points);
      areaEl.textContent = area.toFixed(1);
    }
    if (perimEl) {
      const perim = calculatePerimeter(points);
      perimEl.textContent = perim.toFixed(1);
    }
    if (pointCountEl) {
      pointCountEl.textContent = points.length;
    }
  }

  function updateCoordList() {
    const listEl = document.getElementById('coordList');
    if (!listEl) return;
    listEl.innerHTML = '';
    points.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'coord-item';
      item.textContent = `${i + 1}: ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;
      listEl.appendChild(item);
    });
  }

  function initMap(containerId, cityCode) {
    if (map) {
      map.invalidateSize();
      return;
    }

    const coords = CITY_COORDS[cityCode?.toLowerCase()] || CITY_COORDS.default;

    map = L.map(containerId, {
      zoomControl: true,
      attributionControl: false,
      zoom: coords.zoom,
      center: [coords.lat, coords.lng],
    });

    const satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 21,
      minZoom: 3,
      opacity: 1,
    });

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 3,
    });

    satelliteLayer.addTo(map);

    const layerControl = L.control.layers(
      { 'Satellite': satelliteLayer, 'Street Map': streetLayer },
      null,
      { position: 'topright' }
    ).addTo(map);

    map.on('click', (e) => {
      points.push({ lat: e.latlng.lat, lng: e.latlng.lng });
      updatePolygon();
      updateCoordList();
    });

    // Restore center point marker if coming from form with KML
    centerPoint = L.marker([coords.lat, coords.lng], {
      icon: L.divIcon({
        className: 'center-marker',
        html: '&#9670;',
        iconSize: [12, 12],
      })
    });

    setTimeout(() => map.invalidateSize(), 300);
  }

  function getGPS() {
    if (!navigator.geolocation) {
      APP.showToast('GPS not available on this device', 'error');
      return;
    }

    APP.showLoading('Getting GPS location...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        if (gpsMarker) map.removeLayer(gpsMarker);
        if (gpsAccuracy) map.removeLayer(gpsAccuracy);

        gpsAccuracy = L.circle([latitude, longitude], {
          radius: accuracy,
          color: '#4285f4',
          fillColor: '#4285f4',
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(map);

        gpsMarker = L.marker([latitude, longitude], {
          icon: L.divIcon({
            className: 'gps-marker',
            iconSize: [16, 16],
          })
        }).addTo(map);

        map.setView([latitude, longitude], map.getZoom());

        APP.hideLoading();
        APP.showToast('GPS location found', 'success');
      },
      (err) => {
        APP.hideLoading();
        APP.showToast('GPS error: ' + err.message, 'error');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function undoPoint() {
    if (points.length === 0) return;
    points.pop();
    updatePolygon();
    updateCoordList();
  }

  function clearAll() {
    if (points.length === 0) return;
    if (!confirm('Ma hubtaa inaad tirtirto dhibcaha oo dhan?')) return;
    points = [];
    updatePolygon();
    updateCoordList();
  }

  function toggleCoordList() {
    const el = document.getElementById('coordList');
    if (el) el.classList.toggle('open');
  }

  function generateKML(ownerName, surveyDate) {
    if (points.length < 3) {
      APP.showToast('Please digitize at least 3 points to generate KML', 'error');
      return null;
    }

    const name = ownerName || 'Unknown';
    const date = surveyDate || new Date().toISOString().split('T')[0];
    const area = calculateArea(points);
    const perim = calculatePerimeter(points);
    const safeName = name.replace(/[^a-zA-Z0-9]/g, '_');

    let coordsStr = points.map(p => `${p.lng},${p.lat},0`).join(' ');
    coordsStr += ` ${points[0].lng},${points[0].lat},0`;

    const centerLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const centerLng = points.reduce((s, p) => s + p.lng, 0) / points.length;

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>MUNICIPALITY_${safeName}_${date}</name>
    <Placemark>
      <name>${name}</name>
      <description>
        Area: ${area.toFixed(1)} m²
        Perimeter: ${perim.toFixed(1)} m
        Survey Date: ${date}
        Points: ${points.length}
      </description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordsStr}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
      <ExtendedData>
        <Data name="owner_name"><value>${name}</value></Data>
        <Data name="area_m2"><value>${area.toFixed(1)}</value></Data>
        <Data name="perimeter_m"><value>${perim.toFixed(1)}</value></Data>
        <Data name="survey_date"><value>${date}</value></Data>
        <Data name="center_lat"><value>${centerLat.toFixed(6)}</value></Data>
        <Data name="center_lng"><value>${centerLng.toFixed(6)}</value></Data>
      </ExtendedData>
    </Placemark>
  </Document>
</kml>`;

    return { kml, filename: `MUNICIPALITY_${safeName}_${date}.kml`, area, perim, centerLat, centerLng };
  }

  function downloadKML(kmlData) {
    if (!kmlData) return;

    const blob = new Blob([kmlData.kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = kmlData.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Store KML reference for form
    try {
      const kmlRef = {
        filename: kmlData.filename,
        area: kmlData.area,
        perimeter: kmlData.perim,
        centerLat: kmlData.centerLat,
        centerLng: kmlData.centerLng,
        pointCount: points.length,
        coords: points.map(p => ({ lat: p.lat, lng: p.lng })),
        kmlContent: kmlData.kml,
      };
      sessionStorage.setItem('kml_digitized', JSON.stringify(kmlRef));
    } catch (e) {
      // sessionStorage might have size limits for large KML
      sessionStorage.setItem('kml_digitized', JSON.stringify({
        filename: kmlData.filename,
        area: kmlData.area,
        perimeter: kmlData.perim,
        centerLat: kmlData.centerLat,
        centerLng: kmlData.centerLng,
        pointCount: points.length,
      }));
    }

    return kmlData;
  }

  function getDigitizedData() {
    const area = calculateArea(points);
    const perim = calculatePerimeter(points);
    const centerLat = points.length > 0 ? points.reduce((s, p) => s + p.lat, 0) / points.length : 0;
    const centerLng = points.length > 0 ? points.reduce((s, p) => s + p.lng, 0) / points.length : 0;

    return {
      points: points.map(p => ({ lat: p.lat, lng: p.lng })),
      area,
      perimeter: perim,
      centerLat,
      centerLng,
      pointCount: points.length,
    };
  }

  return {
    initMap,
    getGPS,
    undoPoint,
    clearAll,
    toggleCoordList,
    generateKML,
    downloadKML,
    getDigitizedData,
  };
})();
