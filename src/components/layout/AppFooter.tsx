export default function AppFooter() {
    return (
      <footer className="w-full mt-12 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-center items-center">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Nikosoft Technologies Limited. All rights reserved.
          </p>
        </div>
      </footer>
    )
  }