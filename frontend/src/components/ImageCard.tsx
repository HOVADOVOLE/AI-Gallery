/**
 * A modern, clean image tile component.
 * Focuses on the image content. Metadata appears on hover.
 */

import { Image, Text, Badge, Group, Stack, Checkbox, Box, Overlay, Transition, ActionIcon } from '@mantine/core';
import { useSelectionStore } from '../store/selectionStore';
import { useHover } from '@mantine/hooks';
import { IconInfoCircle } from '@tabler/icons-react';

interface ImageCardProps {
  image: {
    id: number;
    filename: string;
    file_hash: string;
    captured_at?: string;
    tags: { id: number; name: string; category: string }[];
  };
  onClick: () => void;
}

export function ImageCard({ image, onClick }: ImageCardProps) {
  const { isSelectionMode, selectedIds, toggleImageSelection } = useSelectionStore();
  const { hovered, ref } = useHover();
  
  const isSelected = selectedIds.has(image.id);
  const thumbnailUrl = `/thumbnails/${image.file_hash}.jpg`;

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode || e.ctrlKey || e.metaKey) {
        e.stopPropagation();
        toggleImageSelection(image.id);
    } else {
        onClick();
    }
  };

  return (
    <Box 
        ref={ref}
        style={{ 
            position: 'relative', 
            borderRadius: '12px', 
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            transform: isSelected ? 'scale(0.96)' : 'scale(1)',
            border: isSelected ? '3px solid #228be6' : '1px solid transparent',
            boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
        }}
        onClick={handleClick}
    >
      <Image
        src={thumbnailUrl}
        height={320} // Taller images
        fit="cover"
        alt={image.filename}
        fallbackSrc="https://placehold.co/600x400?text=No+Thumbnail"
      />

      {/* Selection Checkbox (Always visible if mode active, or on hover) */}
      <Transition mounted={isSelectionMode || isSelected || hovered} transition="fade" duration={200}>
        {(styles) => (
            <Box 
                style={{ ...styles, position: 'absolute', top: 10, left: 10, zIndex: 10 }}
                onClick={(e) => e.stopPropagation()} 
            >
                <Checkbox 
                    checked={isSelected} 
                    onChange={() => toggleImageSelection(image.id)}
                    size="md"
                    styles={{ input: { cursor: 'pointer', borderColor: 'white' } }}
                />
            </Box>
        )}
      </Transition>

      {/* Info Overlay (Only on Hover) */}
      <Transition mounted={hovered} transition="slide-up" duration={200} timingFunction="ease">
        {(styles) => (
            <Overlay 
                gradient="linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)"
                style={{ 
                    ...styles, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'flex-end',
                    padding: '12px'
                }}
                zIndex={5}
            >
                <Stack gap={4}>
                    <Text c="white" fw={600} size="sm" truncate>
                        {image.filename}
                    </Text>
                    
                    <Group gap={6} style={{ overflow: 'hidden', height: 24 }}>
                        {(image.tags || []).slice(0, 4).map((tag) => (
                            <Badge 
                                key={tag.id} 
                                size="sm" 
                                variant="filled" 
                                color="rgba(255,255,255,0.2)"
                                style={{ color: 'white', textTransform: 'none' }}
                            >
                                {tag.name}
                            </Badge>
                        ))}
                    </Group>
                    
                    <Group justify="space-between" mt={4}>
                        <Text size="xs" c="dimmed">
                            {image.captured_at ? new Date(image.captured_at).toLocaleDateString() : ''}
                        </Text>
                        <ActionIcon variant="transparent" color="white" size="sm">
                            <IconInfoCircle />
                        </ActionIcon>
                    </Group>
                </Stack>
            </Overlay>
        )}
      </Transition>
    </Box>
  );
}