import { useParams } from 'react-router-dom';
import { PagePlaceholder } from '@/components/layout/PagePlaceholder';
const RoomLobbyPage = () => {
  const { id } = useParams();
  return <PagePlaceholder title="Лоби на стая" subtitle={`Стая ${id ?? ''}`} />;
};
export default RoomLobbyPage;
