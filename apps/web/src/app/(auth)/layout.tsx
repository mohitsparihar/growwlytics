export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold text-gray-900 tracking-tight">
          Growwlytics
        </span>
      </div>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {children}
      </div>
    </div>
  );
}
