import { useMemo } from 'react';
import { Button, Empty, Tag, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, HolderOutlined } from '@ant-design/icons';
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { AdminCategory } from '../../lib/catalog-administration';

type Labels = {
  reorder: string;
  reorderHint: string;
  clearFilters: string;
  priority: string;
  active: string;
  inactive: string;
  edit: string;
  remove: string;
  empty: string;
};

type CategoryOrderListProps = {
  categories: AdminCategory[];
  positions: Map<number, number>;
  disabled: boolean;
  actionDisabled: boolean;
  filtered: boolean;
  labels: Labels;
  itemCount: (category: AdminCategory) => string;
  onEdit: (category: AdminCategory) => void;
  onDelete: (category: AdminCategory) => void;
  onReorder: (orderedIds: number[]) => void;
};

function SortableCategory({ category, position, disabled, actionDisabled, labels, count, onEdit, onDelete }: {
  category: AdminCategory;
  position: number;
  disabled: boolean;
  actionDisabled: boolean;
  labels: Labels;
  count: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled,
  });

  return (
    <div ref={setNodeRef} className={`catalog-category-row ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}>
      <Tooltip title={disabled ? undefined : labels.reorder}>
        <button ref={setActivatorNodeRef} type="button" className="catalog-category-handle" disabled={disabled}
          aria-label={`${labels.reorder}: ${category.name}`} {...attributes} {...listeners}>
          <HolderOutlined />
        </button>
      </Tooltip>
      <div className="catalog-category-rank" aria-label={`${labels.priority} ${position}`}>{position}</div>
      <div className="catalog-category-details">
        <button type="button" className="catalog-item-name" disabled={actionDisabled} onClick={onEdit}>{category.name}</button>
        <span className="catalog-item-meta">#{category.id} <span aria-hidden="true">·</span> {count}</span>
      </div>
      <Tag className="catalog-category-state" color={category.isActive ? 'green' : 'default'}>
        {category.isActive ? labels.active : labels.inactive}
      </Tag>
      <div className="catalog-category-actions">
        <Button type="text" icon={<EditOutlined />} disabled={actionDisabled} onClick={onEdit}
          aria-label={`${labels.edit} ${category.name}`} />
        <Button type="text" danger icon={<DeleteOutlined />} disabled={actionDisabled} onClick={onDelete}
          aria-label={`${labels.remove} ${category.name}`} />
      </div>
    </div>
  );
}

export function CategoryOrderList({ categories, positions, disabled, actionDisabled, filtered, labels, itemCount, onEdit, onDelete, onReorder }: CategoryOrderListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = useMemo(() => categories.map(category => category.id), [categories]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (disabled || !over || active.id === over.id) return;
    const from = ids.indexOf(Number(active.id));
    const to = ids.indexOf(Number(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };

  return (
    <div className="catalog-category-sort">
      <p className="catalog-category-instructions">{filtered ? labels.clearFilters : labels.reorderHint}</p>
      {categories.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={labels.empty} /> : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="catalog-category-list">
              {categories.map(category => (
                <SortableCategory key={category.id} category={category} position={positions.get(category.id) ?? 0}
                  disabled={disabled} actionDisabled={actionDisabled} labels={labels} count={itemCount(category)}
                  onEdit={() => onEdit(category)} onDelete={() => onDelete(category)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
