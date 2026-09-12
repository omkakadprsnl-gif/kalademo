import Link from "next/link";

export function NavBar({ admin = false }: { admin?: boolean }) {
  return (
    <header className="topbar">
      <Link className="brand" href={admin ? "/revatigawandeadmin/panel" : "/"}>
        <img className="brand-mark" src="/kalashala-logo.jpg" alt="Kalashala" />
        <span>Kalashala</span>
      </Link>

      <nav className="topnav">
        {admin ? (
          <Link className="nav-link" href="/">
            Home
          </Link>
        ) : (
          <Link className="nav-link" href="/">
            Courses
          </Link>
        )}
      </nav>
    </header>
  );
}
