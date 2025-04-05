import { Layout } from '@/components/layout/Layout';
import { AmendmentManager } from '@/components/amendment/AmendmentManager';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PendingAmendments() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Pending Amendments</h1>
        </div>

        <AmendmentManager
          manualId="all"
          onAmendmentStatusChange={() => {
            // Refresh the page to show updated amendments
            window.location.reload();
          }}
        />
      </div>
    </Layout>
  );
} 