import { useState, useEffect } from 'react';
import { Modal, Image, Grid, Stack, Text, Group, Badge, ActionIcon, Button, Table, TextInput, ScrollArea } from '@mantine/core';
import { IconX, IconTrash, IconDownload, IconPlus, IconTag, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { notifications } from '@mantine/notifications';

interface ImageDetailModalProps {
  imageId: number | null;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export function ImageDetailModal({ imageId, onClose, onNext, onPrev, hasNext, hasPrev }: ImageDetailModalProps) {
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState('');

  // Keyboard Navigation
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!imageId) return;
          
          // Only navigate if input is not focused
          if (document.activeElement?.tagName === 'INPUT') return;

          if (e.key === 'ArrowRight' && hasNext) onNext?.();
          if (e.key === 'ArrowLeft' && hasPrev) onPrev?.();
          if (e.key === 'Escape') onClose();
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageId, hasNext, hasPrev, onNext, onPrev, onClose]);


  // Fetch full details
  const { data: image } = useQuery({
    queryKey: ['image', imageId],
    queryFn: async () => {
        if (!imageId) return null;
        const res = await api.get(`/gallery/images/${imageId}`);
        return res.data;
    },
    enabled: !!imageId
  });

  // Mutation: Add Tag
  const addTagMutation = useMutation({
      mutationFn: async () => {
          await api.post(`/manage/images/${imageId}/tags`, { tag_name: newTag });
      },
      onSuccess: () => {
          setNewTag('');
          queryClient.invalidateQueries({ queryKey: ['image', imageId] });
          notifications.show({ message: 'Tag added', color: 'green' });
      }
  });

  // Mutation: Remove Tag
  const removeTagMutation = useMutation({
      mutationFn: async (tagId: number) => {
          await api.delete(`/manage/images/${imageId}/tags/${tagId}`);
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['image', imageId] });
          notifications.show({ message: 'Tag removed', color: 'blue' });
      }
  });

  if (!imageId) return null;

  return (
    <Modal 
        opened={!!imageId} 
        onClose={onClose} 
        fullScreen 
        padding={0}
        withCloseButton={false}
        styles={{ body: { height: '100vh', display: 'flex' } }}
    >
        {/* Close Button Overlay */}
        <ActionIcon 
            variant="filled" 
            color="dark" 
            size="lg" 
            radius="xl" 
            style={{ position: 'absolute', top: 20, right: 20, zIndex: 100 }}
            onClick={onClose}
        >
            <IconX size={20} />
        </ActionIcon>

        <Grid style={{ width: '100%', margin: 0 }} gutter={0}>
            {/* Left: Image Canvas */}
            <Grid.Col span={{ base: 12, md: 9 }} style={{ backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', position: 'relative' }}>
                
                {/* Navigation Arrows */}
                {hasPrev && (
                    <ActionIcon 
                        onClick={onPrev} 
                        style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 90 }} 
                        size="xl" radius="xl" variant="filled" color="dark" bg="rgba(0,0,0,0.5)"
                    >
                        <IconChevronLeft />
                    </ActionIcon>
                )}
                {hasNext && (
                    <ActionIcon 
                        onClick={onNext} 
                        style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 90 }} 
                        size="xl" radius="xl" variant="filled" color="dark" bg="rgba(0,0,0,0.5)"
                    >
                        <IconChevronRight />
                    </ActionIcon>
                )}

                {image && (
                    <Image 
                        src={`/api/gallery/images/${imageId}/file`} 
                        fit="contain"
                        h="100vh"
                        w="100%"
                    />
                )}
            </Grid.Col>

            {/* Right: Sidebar Info */}
            <Grid.Col span={{ base: 12, md: 3 }} style={{ borderLeft: '1px solid #333', backgroundColor: 'var(--mantine-color-body)' }}>
                <ScrollArea h="100vh" p="xl">
                    <Stack gap="xl">
                        {/* Header Info */}
                        <div>
                            <Text fw={700} size="lg" truncate>{image?.filename}</Text>
                            <Text c="dimmed" size="sm">
                                {image?.captured_at ? new Date(image.captured_at).toLocaleString() : 'Date unknown'}
                            </Text>
                        </div>

                        {/* Actions */}
                        <Group>
                            <Button 
                                variant="light" 
                                leftSection={<IconDownload size={16} />} 
                                component="a" 
                                href={`/api/gallery/images/${imageId}/file`} 
                                download={image?.filename}
                            >
                                Download
                            </Button>
                            <Button variant="light" color="red" leftSection={<IconTrash size={16} />}>
                                Delete
                            </Button>
                        </Group>

                        {/* Tags Section */}
                        <div>
                            <Group justify="space-between" mb="xs">
                                <Group gap={5}>
                                    <IconTag size={16} />
                                    <Text fw={600}>Tags</Text>
                                </Group>
                            </Group>
                            
                            <Group gap={8} mb="md">
                                {image?.tags?.map((tag: any) => (
                                    <Badge 
                                        key={tag.id} 
                                        size="lg" 
                                        variant="light" 
                                        p="sm"
                                        rightSection={
                                            <ActionIcon size="xs" color="blue" radius="xl" variant="transparent" onClick={() => removeTagMutation.mutate(tag.id)}>
                                                <IconX size={10} />
                                            </ActionIcon>
                                        }
                                    >
                                        {tag.name}
                                    </Badge>
                                ))}
                                {image?.tags?.length === 0 && <Text c="dimmed" size="sm">No tags yet.</Text>}
                            </Group>

                            <Group gap={5}>
                                <TextInput 
                                    placeholder="Add new tag..." 
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.currentTarget.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newTag) addTagMutation.mutate();
                                    }}
                                    style={{ flex: 1 }}
                                />
                                <ActionIcon 
                                    variant="filled" 
                                    color="blue" 
                                    size="lg" 
                                    onClick={() => newTag && addTagMutation.mutate()}
                                    loading={addTagMutation.isPending}
                                >
                                    <IconPlus size={18} />
                                </ActionIcon>
                            </Group>
                        </div>

                        {/* EXIF Data Table */}
                        <div>
                            <Text fw={600} mb="xs">Metadata</Text>
                            <Table variant="vertical" layout="fixed" withTableBorder>
                                <Table.Tbody>
                                    <Table.Tr>
                                        <Table.Th w={100}>Camera</Table.Th>
                                        <Table.Td>{image?.camera_model || 'N/A'}</Table.Td>
                                    </Table.Tr>
                                    <Table.Tr>
                                        <Table.Th>Resolution</Table.Th>
                                        <Table.Td>{image?.width} x {image?.height}</Table.Td>
                                    </Table.Tr>
                                    <Table.Tr>
                                        <Table.Th>File Size</Table.Th>
                                        <Table.Td>{image?.file_size ? (image.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}</Table.Td>
                                    </Table.Tr>
                                     <Table.Tr>
                                        <Table.Th>File Hash</Table.Th>
                                        <Table.Td style={{ wordBreak: 'break-all', fontSize: 10 }}>{image?.file_hash}</Table.Td>
                                    </Table.Tr>
                                </Table.Tbody>
                            </Table>
                        </div>
                    </Stack>
                </ScrollArea>
            </Grid.Col>
        </Grid>
    </Modal>
  );
}