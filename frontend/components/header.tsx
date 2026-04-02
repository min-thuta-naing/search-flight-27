'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Plane, Menu, Search, BarChart3, MapPin, LogIn, UserPlus, Route, LayoutDashboard, } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const isDashboard = pathname.startsWith('/dashboard')
  const isFlightRoutes = pathname.startsWith('/flight-routes')
  const isHome = pathname === '/'

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault()
    setIsMobileMenuOpen(false)

    if (!isHome) {
      // Navigate to home page with hash — scroll happens after navigation
      router.push(`/#${targetId}`)
      return
    }

    const targetElement = document.getElementById(targetId)
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo — clickable, navigates to home */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Plane className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Flight Search</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 absolute left-1/2 transform -translate-x-1/2">
          <a
            href="#search"
            onClick={(e) => handleNavClick(e, 'search')}
            className="text-sm font-medium hover:text-primary transition-all duration-300 hover:translate-y-0.5 active:translate-y-1"
          >
            {'ค้นหา'}
          </a>
          <a
            href="#analysis"
            onClick={(e) => handleNavClick(e, 'analysis')}
            className="text-sm font-medium hover:text-primary transition-all duration-300 hover:translate-y-0.5 active:translate-y-1"
          >
            {'วิเคราะห์ราคา'}
          </a>
          <a
            href="#destinations"
            onClick={(e) => handleNavClick(e, 'destinations')}
            className="text-sm font-medium hover:text-primary transition-all duration-300 hover:translate-y-0.5 active:translate-y-1"
          >
            {'ปลายทางยอดนิยม'}
          </a>
          <Link
            href="/flight-routes"
            className={`text-sm font-medium transition-all duration-300 hover:translate-y-0.5 active:translate-y-1 ${
              isFlightRoutes ? 'text-primary' : 'hover:text-primary'
            }`}
          >
            {'เส้นทางการบิน'}
          </Link>
          <Link
            href="/dashboard"
            className={`text-sm font-medium transition-all duration-300 hover:translate-y-0.5 active:translate-y-1 ${
              isDashboard ? 'text-primary' : 'hover:text-primary'
            }`}
          >
            {'แดชบอร์ด'}
          </Link>
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-2">
          {/* <Button variant="ghost" size="sm">
            {'เข้าสู่ระบบ'}
          </Button>
          <Button size="sm">
            {'สมัครสมาชิก'}
          </Button> */}
        </div>

        {/* Mobile Menu */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="hover:bg-primary/10">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[320px] sm:w-[380px] p-0 flex flex-col bg-gradient-to-b from-background to-secondary/20"
          >
            {/* Header Section with Gradient Background */}
            <div className="bg-gradient-to-br from-primary to-primary/80 p-6 pb-8">
              <SheetHeader className="space-y-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                      <Plane className="w-7 h-7 text-white" />
                    </div>
                    <SheetTitle className="text-white text-xl font-bold">
                      Flight Search
                    </SheetTitle>
                  </div>
                </div>
                <p className="text-white/90 text-sm font-normal">
                  ค้นหาตั๋วเครื่องบินราคาถูกที่สุด
                </p>
              </SheetHeader>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 px-6 py-6 space-y-2 overflow-y-auto">
              <a
                href="#search"
                onClick={(e) => handleNavClick(e, 'search')}
                className="flex items-center gap-4 px-4 py-4 rounded-xl bg-background/80 hover:bg-primary/10 hover:shadow-md transition-all duration-200 group border border-border/50"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <Search className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-base font-semibold text-foreground group-hover:text-primary transition-colors flex-1">
                  {'ค้นหา'}
                </span>
              </a>

              <a
                href="#analysis"
                onClick={(e) => handleNavClick(e, 'analysis')}
                className="flex items-center gap-4 px-4 py-4 rounded-xl bg-background/80 hover:bg-primary/10 hover:shadow-md transition-all duration-200 group border border-border/50"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <BarChart3 className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-base font-semibold text-foreground group-hover:text-primary transition-colors flex-1">
                  {'วิเคราะห์ราคา'}
                </span>
              </a>

              <a
                href="#destinations"
                onClick={(e) => handleNavClick(e, 'destinations')}
                className="flex items-center gap-4 px-4 py-4 rounded-xl bg-background/80 hover:bg-primary/10 hover:shadow-md transition-all duration-200 group border border-border/50"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <MapPin className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-base font-semibold text-foreground group-hover:text-primary transition-colors flex-1">
                  {'ปลายทางยอดนิยม'}
                </span>
              </a>

              <Link
                href="/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-primary/10 hover:shadow-md transition-all duration-200 group border border-border/50 ${
                  isDashboard ? 'bg-primary/10 border-primary/30' : 'bg-background/80'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  isDashboard ? 'bg-primary/20' : 'bg-primary/10 group-hover:bg-primary/20'
                }`}>
                  <LayoutDashboard className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <span className={`text-base font-semibold transition-colors flex-1 ${
                  isDashboard ? 'text-primary' : 'text-foreground group-hover:text-primary'
                }`}>
                  {'แดชบอร์ด'}
                </span>
              </Link>

              <Link
                href="/flight-routes"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-primary/10 hover:shadow-md transition-all duration-200 group border border-border/50 ${
                  isFlightRoutes ? 'bg-primary/10 border-primary/30' : 'bg-background/80'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  isFlightRoutes ? 'bg-primary/20' : 'bg-primary/10 group-hover:bg-primary/20'
                }`}>
                  <Route className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <span className={`text-base font-semibold transition-colors flex-1 ${
                  isFlightRoutes ? 'text-primary' : 'text-foreground group-hover:text-primary'
                }`}>
                  {'เส้นทางการบิน'}
                </span>
              </Link>

              {/* Divider */}
              <div className="pt-4 pb-2">
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
              </div>

              {/* Auth Buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start gap-3 h-12 border-2 hover:bg-primary/5 hover:border-primary/50 transition-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <LogIn className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{'เข้าสู่ระบบ'}</span>
                </Button>
                <Button
                  size="lg"
                  className="w-full justify-center gap-3 h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all font-semibold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <UserPlus className="w-5 h-5" />
                  {'สมัครสมาชิก'}
                </Button>
              </div>
            </nav>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/50 bg-background/50">
              <p className="text-xs text-muted-foreground text-center">
                © {new Date().getFullYear()} Flight Search
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
