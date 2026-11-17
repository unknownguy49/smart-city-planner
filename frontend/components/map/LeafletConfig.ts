import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LeafletDefaultIconPrototype
  extends L.Icon.Default {
  _getIconUrl?: string;
}

delete (
  L.Icon.Default.prototype as unknown as LeafletDefaultIconPrototype
)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});