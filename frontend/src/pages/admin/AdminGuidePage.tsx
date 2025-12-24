import { AdminGuide } from '@/components/admin/AdminGuide';

export function AdminGuidePage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-text-primary">Admin Guide</h1>
                <p className="text-text-secondary mt-1">Everything you need to know about managing the platform</p>
            </div>

            {/* Guide Component - always expanded on this page */}
            <AdminGuide defaultOpen={true} />
        </div>
    );
}
