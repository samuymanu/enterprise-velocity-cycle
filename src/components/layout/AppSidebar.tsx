import { useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";
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

	// Estado del provider (toggle desde el botón del header)
	let open = true;
	let setSidebarOpen: ((v: boolean) => void) | null = null;
	try {
		// El hook solo funciona si estamos dentro del provider; en SSR o pruebas puede fallar.
		// Se envuelve en try para evitar errores fuera de contexto.
		const sidebar = useSidebar();
		open = sidebar.open;
		setSidebarOpen = sidebar.setOpen;
	} catch (e) {
		// noop: deja open = true por defecto
	}

	const collapsed = !open;
	const asideBase = "h-screen bg-white border-r flex flex-col select-none transition-all duration-200 ease-in-out";
	const asideExpanded = "w-64 translate-x-0";
	const asideCollapsed = "w-16 overflow-hidden pointer-events-auto";

	return (
		<aside
			className={`${asideBase} ${collapsed ? asideCollapsed : asideExpanded}`}
			data-collapsed={collapsed}
			aria-hidden={collapsed}
		>
			{/* Logo */}
			<div className={"flex items-center " + (collapsed ? "justify-center py-4 border-b" : "gap-3 px-6 py-6 border-b") }>
				<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white text-xl font-bold">
					<Package className="w-6 h-6" />
				</div>
				{!collapsed && (
					<div className="flex flex-col">
						<span className="text-lg font-bold text-blue-900">BikeShop</span>
						<span className="text-xs text-blue-400">ERP System</span>
					</div>
				)}
			</div>

			{/* Menú principal */}
			<nav className={"flex-1 py-4 " + (collapsed ? "px-1 space-y-1" : "px-2 space-y-1")}>
				{navigationItems.map((item) => {
					if (item.children) {
						return (
							<div key={item.title}>
								<button
									className={collapsed ? `flex items-center justify-center w-full py-3 rounded-lg transition` : `flex items-center w-full px-3 py-2 rounded-lg border ${
										inventoryOpen
											? "border-blue-400 bg-blue-50"
											: "border-transparent"
										} text-blue-900 font-medium focus:outline-none transition`}
									onClick={() => {
										// If collapsed, clicking the icon should expand the sidebar
										if (collapsed) {
											setSidebarOpen?.(true)
											return
										}
										setInventoryOpen((v) => !v)
									}}
									title={item.title}
								>
									<span className={collapsed ? "" : "mr-2"}>{item.icon}</span>
									{!collapsed && <span className="flex-1 text-left">{item.title}</span>}
									{!collapsed && (inventoryOpen ? (
										<ChevronDown className="w-4 h-4" />
									) : (
										<ChevronRight className="w-4 h-4" />
									))}
								</button>
								{!collapsed && inventoryOpen && (
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
							onClick={() => {
								// If collapsed, expand first so the user sees the menu
								if (collapsed) {
									setSidebarOpen?.(true)
								}
							}}
							className={({ isActive }) =>
								collapsed
									? `flex items-center justify-center px-2 py-3 rounded-lg text-blue-900 font-medium transition ${isActive ? "bg-blue-100" : "hover:bg-blue-50"}`
									: `flex items-center gap-3 px-3 py-2 rounded-lg text-blue-900 font-medium transition ${isActive ? "bg-blue-100" : "hover:bg-blue-50"}`
							}
						>
							<span>{item.icon}</span>
							{!collapsed && <span>{item.title}</span>}
						</NavLink>
					);
				})}
			</nav>
		</aside>
	);
}