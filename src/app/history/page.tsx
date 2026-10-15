import { Dashboard } from "../../ui/dashboard";
import { loadDataset } from "../../ui/data";

export default function HistoryPage() { return <Dashboard dataset={loadDataset()} mode="history" />; }
