import { useContext } from "react";
import { LiveLocationShareContext } from "../context/live-location-share-context";

export const useLiveLocationShare = () => {
  const context = useContext(LiveLocationShareContext);
  if (!context) throw new Error("useLiveLocationShare debe usarse dentro de LiveLocationShareProvider");
  return context;
};
