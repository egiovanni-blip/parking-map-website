export default function DesktopOnlyNotice({ title, message }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-900">{title || 'Use a computer'}</h1>
        <p className="mt-3 text-gray-600">
          {message || 'The parking map is available on a desktop or laptop. Open this site on a computer to continue.'}
        </p>
      </div>
    </div>
  )
}
