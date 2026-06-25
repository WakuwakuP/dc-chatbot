import { Route, Routes } from "react-router-dom";
import { AutomatedTriggerSourcesRoute } from "./AutomatedTriggerSourcesRoute";
import { CandidatesRoute } from "./CandidatesRoute";
import { HomeRoute } from "./HomeRoute";
import { MembersRoute } from "./MembersRoute";
import { OwnerLayout } from "./OwnerLayout";
import { SettingsRoute } from "./SettingsRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<OwnerLayout />}>
        <Route index element={<HomeRoute />} />
        <Route path="members" element={<MembersRoute />} />
        <Route path="candidates" element={<CandidatesRoute />} />
        <Route path="settings" element={<SettingsRoute />} />
        <Route
          path="automated-trigger-sources"
          element={<AutomatedTriggerSourcesRoute />}
        />
      </Route>
    </Routes>
  );
}
