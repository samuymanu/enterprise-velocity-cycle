import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Package, ShoppingCart, Users, BarChart2, Settings, Wrench, User, ChevronDown, ChevronRight, Home, DollarSign, ShoppingBag } from "lucide-react";

const navigationItems = [
	{
		title: "Dashboard",
		url: "/",
		icon: <Home className="w-5 h-5" />,
	},
	{
		title: "Inventario",
		icon: <Package className="w-5 h-5" />,
		children: [
			{
				title: "Productos",
				url: "/inventory",
			},
			{
				title: "Categorías",
				url: "/inventory/categories",
			},
			{
				title: "Marcas",
				url: "/inventory/brands",
			},
			{
				title: "Atributos",
				url: "/inventory/attributes",
			},
		],
	},
	{
		title: "Ventas",
		url: "/sales",
		icon: <DollarSign className="w-5 h-5" />,
	},
	{
		title: "POS",
		url: "/pos",
		icon: <ShoppingCart className="w-5 h-5" />,
	},
	{
		title: "Compras",
		url: "/purchases",
		icon: <ShoppingBag className="w-5 h-5" />,
	},
	{
		title: "Clientes",
		url: "/customers",
		icon: <Users className="w-5 h-5" />,
	},
	{
		title: "Taller",
		url: "/workshop",
		icon: <Wrench className="w-5 h-5" />,
	},
	{
		title: "Reportes",
		url: "/reports",
		icon: <BarChart2 className="w-5 h-5" />,
	},
	{
		title: "Usuarios",
		url: "/users",
		icon: <User className="w-5 h-5" />,
	},
	{
		title: "Configuración",
		url: "/settings",
		icon: <Settings className="w-5 h-5" />,
	},
];

export function AppSidebar() {
	const location = useLocation();
	const [inventoryOpen, setInventoryOpen] = useState(() =>
		[
			"/inventory",
			"/inventory/categories",
			"/inventory/brands",
			"/inventory/attributes",
		].some((p) => location.pathname.startsWith(p))
	);

	return (
		<aside className="h-screen w-64 bg-white border-r flex flex-col select-none">
			{/* Logo */}
			<div className="flex items-center gap-3 px-6 py-6 border-b">
				<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white text-xl font-bold">
					<Package className="w-6 h-6" />
				</div>
				<div className="flex flex-col">
					<span className="text-lg font-bold text-blue-900">BikeShop</span>
					<span className="text-xs text-blue-400">ERP System</span>
				</div>
			</div>

			{/* Menú principal */}
			<nav className="flex-1 px-2 py-4 space-y-1">
				{navigationItems.map((item) => {
					if (item.children) {
						return (
							<div key={item.title}>
								<button
									className={`flex items-center w-full px-3 py-2 rounded-lg border ${
										inventoryOpen
											? "border-blue-400 bg-blue-50"
											: "border-transparent"
									} text-blue-900 font-medium focus:outline-none transition`}
									onClick={() => setInventoryOpen((v) => !v)}
								>
									<span className="mr-2">{item.icon}</span>
									<span className="flex-1 text-left">{item.title}</span>
									{inventoryOpen ? (
										<ChevronDown className="w-4 h-4" />
									) : (
										<ChevronRight className="w-4 h-4" />
									)}
								</button>
								{inventoryOpen && (
									<div className="ml-6 mt-1 mb-2 flex flex-col gap-1 bg-white border border-blue-200 rounded-lg shadow-sm py-2">
										{item.children.map((sub) => {
											const isActive = location.pathname === sub.url;
											return (
												<NavLink
													key={sub.title}
													to={sub.url}
													className={`px-3 py-2 rounded text-sm font-semibold transition ${
														isActive
															? "bg-blue-500 text-white"
															: "text-blue-900 hover:bg-blue-100"
													}`}
												>
													{sub.title}
												</NavLink>
											);
										})}
									</div>
								)}
							</div>
						);
					}
					return (
						<NavLink
							key={item.title}
							to={item.url}
							className={({ isActive }) =>
								`flex items-center gap-3 px-3 py-2 rounded-lg text-blue-900 font-medium transition ${
									isActive ? "bg-blue-100" : "hover:bg-blue-50"
								}`
							}
						>
							<span>{item.icon}</span>
							<span>{item.title}</span>
						</NavLink>
					);
				})}
			</nav>
		</aside>
	);
}