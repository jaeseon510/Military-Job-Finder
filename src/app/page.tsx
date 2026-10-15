import { Dashboard } from "../ui/dashboard";
import { loadDataset } from "../ui/data";

export default function Home() { return <Dashboard dataset={loadDataset()} mode="jobs" />; }
