import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/primitives';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-5xl font-bold tracking-tight text-muted-foreground">404</p>
      <p className="mt-2 text-sm text-muted-foreground">That page doesn’t exist.</p>
      <Link to="/" className="mt-4">
        <Button variant="outline" size="sm">
          Back to dashboard
        </Button>
      </Link>
    </div>
  );
}
