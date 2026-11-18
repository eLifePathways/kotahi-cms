import { Link } from 'wouter'

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-sm">© {new Date().getFullYear()}</p>
          <Link
            href="/contact"
            className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition"
          >
            Contact us
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default Footer
