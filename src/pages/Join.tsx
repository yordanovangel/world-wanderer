import { useParams } from 'react-router-dom';
import { PagePlaceholder } from '@/components/layout/PagePlaceholder';
const JoinPage = () => {
  const { token } = useParams();
  return <PagePlaceholder title="Присъедини се" subtitle={`Покана: ${token ?? ''}`} />;
};
export default JoinPage;
