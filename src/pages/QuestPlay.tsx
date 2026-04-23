import { useParams } from 'react-router-dom';
import { PagePlaceholder } from '@/components/layout/PagePlaceholder';
const QuestPlayPage = () => {
  const { id } = useParams();
  return <PagePlaceholder title="Играй куест" subtitle={`Куест ${id ?? ''}`} />;
};
export default QuestPlayPage;
