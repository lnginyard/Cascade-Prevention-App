import { useAppState } from '../../state/appState.jsx';
import logo from '../../assets/cascade-logo.svg';

export default function Header() {
	const { events, eventId, lastSimulationAt } = useAppState();
	const eventName = events.find((event) => event.id === eventId)?.name || 'Loading event…';
	const simulatedAt = lastSimulationAt ? new Date(lastSimulationAt).toLocaleTimeString() : 'Not run yet';

	return (
		<header className="border-b border-gray-700 bg-gray-800 px-4 py-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<img src={logo} alt="Cascade Prevention logo" className="h-10 w-10 sm:h-11 sm:w-11" />
					<h1 className="text-xl font-semibold text-white">Cascade Prevention Dashboard</h1>
				</div>
				<div className="text-xs text-gray-300">
					<span className="mr-3">Active: {eventName}</span>
					<span>Last run: {simulatedAt}</span>
				</div>
			</div>
		</header>
	);
}
