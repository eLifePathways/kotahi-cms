import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import { useGroup } from '../../hooks'

const navItems = [
  { name: 'Home', path: '/' },
  { name: 'About us', path: '/about-us' },
  { name: 'Publications', path: '/publications' },
  { name: 'Contact', path: '/contact' },
]

const Header = () => {
  const [location] = useLocation()
  const group = useGroup()
  const [isOpen, setIsOpen] = useState(false)

  const closeSheet = () => setIsOpen(false)

  return (
    <header className="bg-background shadow-md">
      <div className="container mx-auto px-4 py-6 flex items-center justify-between border-b border-border">
        <Link href="/" className="font-heading font-bold text-2xl text-primary">
          {group.name}
        </Link>
      </div>

      <div className="container mx-auto px-4 py-4">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-6 w-6 text-primary" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <nav className="flex flex-col space-y-4 mt-8">
              {navItems.map(item => (
                <Link
                  key={item.path + item.name}
                  href={item.path}
                  onClick={closeSheet}
                  className={`text-lg font-medium transition py-2 ${
                    location === item.path
                      ? 'text-primary font-semibold'
                      : 'text-foreground hover:text-primary'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <nav className="hidden md:flex md:items-center md:justify-between">
          {navItems.map(item => (
            <Link
              key={item.path + item.name}
              href={item.path}
              className={`font-medium px-3 py-2 text-sm transition duration-200 border-b-2 mx-1 ${
                location === item.path
                  ? 'text-primary border-primary'
                  : 'text-foreground hover:text-primary border-transparent hover:border-primary/40'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      <div className="bg-primary h-2 w-full"></div>
    </header>
  )
}

export default Header
