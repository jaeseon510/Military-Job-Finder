import { Dashboard } from "../../ui/dashboard";
import { loadDataset } from "../../ui/data";

export default function ExcludedPage() { return <Dashboard dataset={loadDataset()} mode="excluded" />; }
