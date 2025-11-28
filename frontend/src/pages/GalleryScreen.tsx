import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SimpleGrid, Container, Title, Center, Stack, Text, Button, TextInput, Group, Select, Affix, Transition, Paper, Modal, Skeleton, Slider, Box } from '@mantine/core';
import { IconSearch, IconFilter, IconTrash, IconX, IconCheck, IconPhoto, IconLayoutGrid } from '@tabler/icons-react';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { useSearchParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { api } from '../api/client';
import { ImageCard } from '../components/ImageCard';
import { useSelectionStore } from '../store/selectionStore';
import { ImageDetailModal } from '../components/ImageDetailModal';

export function GalleryScreen({ myPhotos = false }: { myPhotos?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // --- State ---
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 500); 
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(searchParams.get('album_id'));
  
  // View Settings
  const [cols, setCols] = useState(5); // Default 5 columns

  // Selection Store
  const { isSelectionMode, selectedIds, toggleSelectionMode, clearSelection } = useSelectionStore();
  
  // Detail Modal State
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  // --- Queries ---
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['images', page, debouncedSearch, selectedAlbum, myPhotos], 
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '50'); // Increased limit for better grid fill
      
      if (myPhotos) {
          params.append('my_photos', 'true');
      }
      
      if (debouncedSearch) {
        params.append('tag', debouncedSearch);
      }
      if (selectedAlbum) {
        params.append('album_id', selectedAlbum);
      }

      const response = await api.get(`/gallery/images?${params.toString()}`);
      return response.data;
    },
  });

  const { data: albums } = useQuery({
    queryKey: ['albums'],
    queryFn: async () => {
      const response = await api.get('/gallery/albums');
      return response.data;
    },
    initialData: [],
  });

  // --- Handlers ---
  const handleAlbumChange = (val: string | null) => {
    setSelectedAlbum(val);
    if (val) {
      setSearchParams({ album_id: val });
    } else {
      setSearchParams({});
    }
  };

  const handleImageClick = (image: any) => {
    // If in selection mode, ignore detail view
    if (isSelectionMode) return;
    setSelectedImageId(image.id);
  };

  // --- Navigation Logic for Modal ---
  const images = data?.items || [];
  const currentIndex = images.findIndex((img: any) => img.id === selectedImageId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < images.length - 1;

  const handleNext = () => {
      if (hasNext) setSelectedImageId(images[currentIndex + 1].id);
  };

  const handlePrev = () => {
      if (hasPrev) setSelectedImageId(images[currentIndex - 1].id);
  };


  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, selectedAlbum, myPhotos]);
  
  // Clear selection when navigating away or unmounting
  useEffect(() => {
      return () => clearSelection();
  }, []);

  // --- Batch Delete Logic ---
  const handleDeleteBatch = async () => {
      try {
          const idsToDelete = Array.from(selectedIds);
          await api.post('/manage/images/delete', idsToDelete);
          
          notifications.show({
              title: 'Success',
              message: `Deleted ${idsToDelete.length} images.`,
              color: 'green'
          });
          
          clearSelection();
          closeDeleteModal();
          refetch(); // Refresh the grid
          
      } catch (error) {
          notifications.show({
              title: 'Error',
              message: 'Failed to delete images.',
              color: 'red'
          });
      }
  };

  // --- SKELETON LOADING ---
  const renderSkeletons = () => (
    <SimpleGrid cols={cols} spacing="xs" verticalSpacing="xs">
        {Array(cols * 3).fill(0).map((_, i) => (
            <Skeleton key={i} height={320} radius="md" />
        ))}
    </SimpleGrid>
  );

  if (isError) {
    return (
      <Center style={{ height: '50vh' }}>
        <Stack align="center">
          <Text c="red">Failed to load images.</Text>
          <Button onClick={() => refetch()}>Retry</Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Container fluid pb={100} px="lg"> 
      <Stack gap="lg">
        {/* HEADER BAR */}
        <Group justify="space-between" align="center" style={{ position: 'sticky', top: 0, zIndex: 90, backgroundColor: 'var(--mantine-color-body)', paddingBottom: 10, paddingTop: 10 }}>
            <Group gap="xs">
                <Title order={3}>{myPhotos ? 'My Photos' : 'Gallery'}</Title>
                {data?.items && (
                   <Text size="sm" c="dimmed" style={{ alignSelf: 'center', marginTop: 4 }}>({data.items.length})</Text>
                )}
            </Group>
            
            <Group gap="sm">
                {/* Search & Filters */}
                 <TextInput
                    placeholder="Search..."
                    leftSection={<IconSearch size={14} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    size="sm"
                    w={180}
                />
                 <Select 
                    placeholder="Album"
                    data={albums.map((a: any) => ({ value: a.id.toString(), label: a.name }))}
                    value={selectedAlbum}
                    onChange={handleAlbumChange}
                    clearable
                    leftSection={<IconFilter size={14} />}
                    size="sm"
                    w={180}
                />
                
                {/* Zoom Slider */}
                <Group gap={6} px="sm" style={{ borderLeft: '1px solid var(--mantine-color-default-border)' }}>
                     <IconLayoutGrid size={16} color="gray" />
                     <Slider 
                        value={cols} 
                        onChange={setCols} 
                        min={2} 
                        max={8} 
                        step={1}
                        w={80}
                        size="sm"
                        showLabelOnHover={false}
                        styles={{ thumb: { borderWidth: 1 } }}
                     />
                     <IconPhoto size={16} color="gray" />
                </Group>
                
                {/* Selection Mode */}
                <Button 
                    variant={isSelectionMode ? "filled" : "light"} 
                    color={isSelectionMode ? "blue" : "gray"}
                    onClick={toggleSelectionMode}
                    size="sm"
                    leftSection={isSelectionMode ? <IconCheck size={14} /> : undefined}
                >
                    {isSelectionMode ? 'Done' : 'Select'}
                </Button>
            </Group>
        </Group>

        {isLoading ? (
            renderSkeletons()
        ) : data.items.length === 0 ? (
          <Center p="xl" style={{ height: 300 }}>
            <Stack align="center" gap="xs">
                <IconSearch size={40} color="gray" />
                <Text c="dimmed" fs="italic">No images found.</Text>
            </Stack>
          </Center>
        ) : (
          <SimpleGrid cols={cols} spacing="xs" verticalSpacing="xs">
            {data.items.map((image: any) => (
              <ImageCard 
                key={image.id} 
                image={image} 
                onClick={() => handleImageClick(image)}
              />
            ))}
          </SimpleGrid>
        )}

        {data?.items.length > 0 && (
           <Group justify="center" mt="xl">
                <Button 
                    variant="subtle" 
                    disabled={page === 0} 
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                >
                    Prev
                </Button>
                <Text size="sm">Page {page + 1}</Text>
                <Button 
                    variant="subtle" 
                    disabled={data.items.length < 50} 
                    onClick={() => setPage(p => p + 1)}
                >
                    Next
                </Button>
           </Group>
        )}
      </Stack>

      {/* Detail Modal (With Navigation) */}
      <ImageDetailModal 
        imageId={selectedImageId} 
        onClose={() => setSelectedImageId(null)} 
        onNext={handleNext}
        onPrev={handlePrev}
        hasNext={hasNext}
        hasPrev={hasPrev}
      />
      
      {/* Floating Action Bar for Selection */}
      <Affix position={{ bottom: 20, left: '50%' }} zIndex={100}>
        <Transition transition="slide-up" mounted={selectedIds.size > 0}>
          {(transitionStyles) => (
            <Paper 
                style={{ 
                    ...transitionStyles, 
                    transform: 'translateX(-50%)', 
                    border: '1px solid #444' 
                }} 
                shadow="xl" 
                p="sm" 
                radius="xl"
                bg="dark.7"
            >
              <Group gap="md">
                <Box px="sm"><Text fw={700} c="white">{selectedIds.size} selected</Text></Box>
                <Button 
                    color="red" 
                    size="xs"
                    leftSection={<IconTrash size={14} />}
                    onClick={openDeleteModal}
                >
                    Delete
                </Button>
                <Button 
                    variant="subtle" 
                    color="gray"
                    size="xs"
                    leftSection={<IconX size={14} />}
                    onClick={clearSelection}
                >
                    Cancel
                </Button>
              </Group>
            </Paper>
          )}
        </Transition>
      </Affix>
      
      {/* Delete Modal */}
      <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Delete Images" centered>
        <Stack>
            <Text>Are you sure you want to delete {selectedIds.size} images?</Text>
            <Group justify="end">
                <Button variant="default" onClick={closeDeleteModal}>Cancel</Button>
                <Button color="red" onClick={handleDeleteBatch}>Delete</Button>
            </Group>
        </Stack>
      </Modal>

    </Container>
  );
}
