import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Title, Text, Container, Paper, Center, Stack, Group, Button, Loader, Image, Badge, ActionIcon, Box, ThemeIcon } from '@mantine/core';
import { IconCheck, IconX, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../api/client';

interface ReviewItem {
  image_id: number;
  tag_id: number;
  image_hash: string;
  tag_name: string;
  confidence: number;
}

const ReviewPage = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch items
  const { data: items, isLoading, isError, refetch } = useQuery({
    queryKey: ['reviewItems'],
    queryFn: async () => {
        const res = await api.get<ReviewItem[]>('/review/items');
        return res.data;
    },
    staleTime: 0,
  });

  // Mutation for action
  const mutation = useMutation({
      mutationFn: async ({ item, action }: { item: ReviewItem, action: 'approve' | 'reject' }) => {
          await api.post(`/review/${item.image_id}/${item.tag_id}`, { action });
      },
      onSuccess: () => {
          setCurrentIndex((prev) => prev + 1);
      },
      onError: () => {
          notifications.show({ title: 'Error', message: 'Action failed', color: 'red' });
      }
  });

  const handleAction = (action: 'approve' | 'reject') => {
      if (!items || !items[currentIndex]) return;
      mutation.mutate({ item: items[currentIndex], action });
  };

  if (isLoading) return <Center h="50vh"><Loader /></Center>;
  if (isError) return <Center h="50vh"><Text c="red">Error loading items.</Text></Center>;

  if (!items || currentIndex >= items.length) {
      return (
          <Container size="xs">
            <Center h="50vh">
                <Stack align="center">
                    <ThemeIcon size={60} radius="xl" color="green" variant="light">
                        <IconCheck size={34} />
                    </ThemeIcon>
                    <Title order={3}>All caught up!</Title>
                    <Text c="dimmed" ta="center">You've reviewed all pending tags.</Text>
                    <Button leftSection={<IconRefresh size={16}/>} onClick={() => { setCurrentIndex(0); refetch(); }}>
                        Check again
                    </Button>
                </Stack>
            </Center>
          </Container>
      );
  }

  const currentItem = items[currentIndex];

  return (
    <Container size="xs" py="xl">
        <Title order={2} ta="center" mb="xl">AI Review Mode</Title>
        
        <Paper shadow="xl" radius="lg" withBorder style={{ overflow: 'hidden', position: 'relative' }}>
            <Box style={{ height: 400, backgroundColor: '#f8f9fa' }}>
                 <Image 
                    src={`/api/gallery/images/${currentItem.image_id}/file`}
                    h={400}
                    fit="contain"
                    fallbackSrc="https://placehold.co/600x400?text=Image+Load+Error"
                 />
            </Box>

            <Stack p="xl" align="center" gap="md">
                <Text size="sm" c="dimmed">Does this image contain:</Text>
                
                <Badge size="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} style={{ fontSize: 24, padding: 20 }}>
                    {currentItem.tag_name}
                </Badge>
                
                <Text size="xs" c="dimmed">
                    AI Confidence: {(currentItem.confidence * 100).toFixed(0)}%
                </Text>

                <Group mt="lg" gap="xl">
                    <ActionIcon 
                        variant="filled" 
                        color="red" 
                        size={60} 
                        radius="xl"
                        onClick={() => handleAction('reject')}
                        disabled={mutation.isPending}
                    >
                        <IconX size={32} />
                    </ActionIcon>
                    
                    <ActionIcon 
                        variant="filled" 
                        color="green" 
                        size={60} 
                        radius="xl"
                        onClick={() => handleAction('approve')}
                        disabled={mutation.isPending}
                    >
                        <IconCheck size={32} />
                    </ActionIcon>
                </Group>
                
                 <Text size="xs" c="dimmed" mt="sm">
                    {items.length - currentIndex} items remaining
                </Text>
            </Stack>
        </Paper>
    </Container>
  );
};

export default ReviewPage;
