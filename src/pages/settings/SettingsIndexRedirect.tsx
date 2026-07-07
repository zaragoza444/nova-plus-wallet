import { Navigate } from "react-router-dom";
import { paths } from "../../lib/routes";
export function SettingsIndexRedirect(): JSX.Element {
  return <Navigate to={paths.settingsAccounts} replace />;
}
