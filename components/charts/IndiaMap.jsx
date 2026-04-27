'use client'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { Tooltip } from 'react-simple-maps'

const GEO_URL = 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/india/india-states.json'

// Map state name variants to normalized
function normalizeState(name) {
  return (name || '').toUpperCase().trim()
    .replace('ANDHRA PRADESH', 'ANDHRA PRADESH')
    .replace('ODISHA', 'ODISHA')
    .replace('ORISSA', 'ODISHA')
}

export default function IndiaMap({ stateData, onStateClick }) {
  const maxOrders = Math.max(...stateData.map(s => s.orders), 1)

  function getColor(geoName) {
    const norm = normalizeState(geoName)
    const found = stateData.find(s => normalizeState(s.state) === norm)
    if (!found) return '#F5F5F5'
    const intensity = found.orders / maxOrders
    // white → black gradient
    const v = Math.round(255 - intensity * 200)
    return `rgb(${v},${v},${v})`
  }

  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ scale: 1000, center: [82, 22] }}
      style={{ width: '100%', height: 400 }}
    >
      <ZoomableGroup zoom={1}>
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const name = geo.properties.NAME_1 || geo.properties.name || ''
              const norm = normalizeState(name)
              const found = stateData.find(s => normalizeState(s.state) === norm)
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={getColor(name)}
                  stroke="#E5E5E5"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { fill: '#525252', outline: 'none', cursor: 'pointer' },
                    pressed: { outline: 'none' },
                  }}
                  onClick={() => onStateClick && found && onStateClick(found)}
                  data-tooltip-id="map-tip"
                  data-tooltip-content={found ? `${found.state}: ${found.orders} orders` : name}
                />
              )
            })
          }
        </Geographies>
      </ZoomableGroup>
    </ComposableMap>
  )
}
