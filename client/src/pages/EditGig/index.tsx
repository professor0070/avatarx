import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { GigCreationForm } from '../../components/gig/GigCreationForm';

export function EditGigPage() {
  const { gigId } = useParams<{ gigId: string }>();

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Edit Gig | AvatarX</title>
        <meta name="description" content="Edit your gig on AvatarX" />
      </Helmet>

      <GigCreationForm gigId={gigId} />
    </div>
  );
}
