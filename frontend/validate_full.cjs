const { validateStyleMin } = require('@maplibre/maplibre-gl-style-spec');
const style = require('./gis_style_full.json');
const errors = validateStyleMin(style.obj);
if (!errors.length) { console.log('FULL STYLE OK'); }
else { errors.forEach(e => console.log(`[${e.level}] ${e.message}`)); }
