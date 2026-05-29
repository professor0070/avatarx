import { Helmet } from 'react-helmet-async';
import { GigCreationForm } from '../components/gig/GigCreationForm';

export function CreateGigPage() {
  return (
    <div className="space-y-6">
      <Helmet>
        <title>Create Gig | AvatarX</title>
        <meta name="description" content="Create a new gig to offer your services on AvatarX" />
      </Helmet>

      <GigCreationForm />
    </div>
  );
}
