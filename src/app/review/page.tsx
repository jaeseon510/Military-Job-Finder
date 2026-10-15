import { Dashboard } from "../../ui/dashboard";
import { loadDataset } from "../../ui/data";

export default function ReviewPage() { return <Dashboard dataset={loadDataset()} mode="review" />; }
