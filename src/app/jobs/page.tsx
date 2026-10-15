import { Dashboard } from "../../ui/dashboard";
import { loadDataset } from "../../ui/data";

export default function JobsPage() { return <Dashboard dataset={loadDataset()} mode="jobs" />; }
