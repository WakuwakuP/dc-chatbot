import { Route, Routes } from "react-router-dom";
import { HomeRoute } from "./HomeRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
    </Routes>
  );
}
