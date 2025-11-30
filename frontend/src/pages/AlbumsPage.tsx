import { useState } from 'react';
import { Title, Text, Container, SimpleGrid, Group, Badge, Button, Stack, Skeleton, Center, BackgroundImage, Box, Overlay, Menu, ActionIcon, Modal } from '@mantine/core';
import { IconFolder, IconPhoto, IconDotsVertical, IconTrash } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { notifications } from '@mantine/notifications';

const AlbumsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Delete State
  const [albumToDelete, setAlbumToDelete] = useState<any>(null);

  // Queries
  const { data: albums, isLoading, isError } = useQuery({
    queryKey: ['albums'],
    queryFn: async () => {
      const response = await api.get('/gallery/albums');
      return response.data;
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
      mutationFn: async () => {
          if (!albumToDelete) return;
          // Cascade=true means delete photos too
          await api.post(`/manage/albums/${albumToDelete.id}/delete?cascade=true`);
      },
      onSuccess: () => {
          notifications.show({ title: 'Success', message: 'Album and photos deleted.', color: 'green' });
          queryClient.invalidateQueries({ queryKey: ['albums'] });
          setAlbumToDelete(null); // Close modal
      },
      onError: () => {
          notifications.show({ title: 'Error', message: 'Failed to delete album.', color: 'red' });
      }
  });

  if (isError) return (
      <Center h="50vh">
          <Text c="red">Error loading albums. Is the backend running?</Text>
      </Center>
  );

  return (
    <Container fluid py="lg">
      <Stack gap="xl">
        <div>
            <Title order={2}>Events & Collections</Title>
            <Text c="dimmed">Browse photos by event folders.</Text>
        </div>

        {isLoading ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, xl: 4 }} spacing="lg">
             {Array(6).fill(0).map((_, i) => <Skeleton key={i} height={220} radius="md" />)}
          </SimpleGrid>
        ) : !albums || albums.length === 0 ? (
          <Center h={300}>
             <Stack align="center">
                <IconFolder size={48} color="gray" />
                <Text c="dimmed">No albums yet.</Text>
                <Button onClick={() => navigate('/import')}>Import Photos</Button>
             </Stack>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, xl: 4 }} spacing="lg">
            {albums.map((album: any) => (
              <Box 
                key={album.id} 
                style={{ 
                    position: 'relative', 
                    height: 220, 
                    borderRadius: 12, 
                    overflow: 'hidden', 
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    transition: 'transform 0.2s ease',
                }}
                className="album-card"
                onClick={() => navigate(`/gallery?album_id=${album.id}`)}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                 <BackgroundImage
                    src={album.cover_photo_hash ? `/thumbnails/${album.cover_photo_hash}.jpg` : ''}
                    h="100%"
                    bg="dark.8"
                 >
                    {!album.cover_photo_hash && (
                        <Center h="100%">
                            <IconFolder size={40} color="gray" />
                        </Center>
                    )}
                    
                    <Overlay gradient="linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.9) 100%)" zIndex={1} />
                    
                    {/* Action Menu (Top Right) */}
                    <div 
                        style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }} 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Menu withinPortal position="bottom-end">
                            <Menu.Target>
                                <ActionIcon variant="filled" color="dark" radius="xl" bg="rgba(0,0,0,0.5)">
                                    <IconDotsVertical size={16} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item 
                                    color="red" 
                                    leftSection={<IconTrash size={14} />}
                                    onClick={() => setAlbumToDelete(album)}
                                >
                                    Delete Album
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </div>

                    <Stack justify="flex-end" h="100%" p="lg" style={{ position: 'relative', zIndex: 2 }}>
                        <Group justify="space-between" align="end">
                            <div style={{ maxWidth: '70%' }}>
                                <Text fw={700} c="white" size="lg" lh={1.2} truncate>
                                    {album.name}
                                </Text>
                                <Text c="dimmed" size="xs" mt={4}>
                                    {new Date(album.created_at).toLocaleDateString()}
                                </Text>
                            </div>
                            <Badge variant="filled" color="dark" leftSection={<IconPhoto size={12}/>}>
                                {album.photo_count}
                            </Badge>
                        </Group>
                    </Stack>
                 </BackgroundImage>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Stack>

      {/* Delete Confirmation Modal */}
      <Modal 
        opened={!!albumToDelete} 
        onClose={() => setAlbumToDelete(null)} 
        title="Delete Album"
        centered
      >
        <Stack>
            <Text>
                Are you sure you want to delete <b>{albumToDelete?.name}</b>?
            </Text>
            <Text size="sm" c="red">
                Warning: This will permanently delete this album and all <b>{albumToDelete?.photo_count}</b> photos contained within it.
            </Text>
            <Group justify="end" mt="md">
                <Button variant="default" onClick={() => setAlbumToDelete(null)}>Cancel</Button>
                <Button 
                    color="red" 
                    onClick={() => deleteMutation.mutate()} 
                    loading={deleteMutation.isPending}
                >
                    Delete Forever
                </Button>
            </Group>
        </Stack>
      </Modal>

    </Container>
  );
};

export default AlbumsPage;