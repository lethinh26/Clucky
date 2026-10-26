import { StrictMode } from 'react'; import { createRoot } from 'react-dom/client'; import './style.css';
function App(){return <main><aside><img src="/logo_primary.png" alt="Clucky"/><nav>Dashboard<br/>Đơn hàng<br/>Thực đơn<br/>Chi nhánh<br/>Báo cáo</nav></aside><section><h1>Clucky Admin</h1><p>Khung quản trị Staff / Store Manager / Admin</p></section></main>}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
