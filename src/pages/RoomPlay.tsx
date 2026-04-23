import { useParams } from 'react-router-dom';
import { PagePlaceholder } from '@/components/layout/PagePlaceholder';
const RoomPlayPage = () => {
  const { id } = useParams();
  return <PagePlaceholder title="Мултиплейър" subtitle={`Стая ${id ?? ''}`} />;
};
export default RoomPlayPage;
