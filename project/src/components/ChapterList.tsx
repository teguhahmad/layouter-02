import React from 'react';
import { useEbookStore } from '../store/useEbookStore';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChapterItem } from './ChapterItem';
import { Plus, Upload } from 'lucide-react';

export function ChapterList() {
  const { chapters, addChapter, reorderChapters } = useEbookStore();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddChapter = (type: 'frontmatter' | 'chapter' | 'backmatter') => {
    const defaultTitles = {
      frontmatter: 'Kata Pengantar',
      chapter: 'Bab Baru',
      backmatter: 'Penutup'
    };

    addChapter({
      id: crypto.randomUUID(),
      title: defaultTitles[type],
      content: '',
      images: [],
      type,
      indentation: 0,
      lineSpacing: 1.5,
      subChapters: [],
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = chapters.findIndex((chapter) => chapter.id === active.id);
      const newIndex = chapters.findIndex((chapter) => chapter.id === over.id);
      reorderChapters(arrayMove(chapters, oldIndex, newIndex));
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Group files by their parent folder
    const fileGroups = new Map<string, File[]>();
    
    for (const file of files) {
      const path = file.webkitRelativePath;
      const parts = path.split('/');
      
      if (parts.length < 2) continue;
      
      const parentFolder = parts[1];
      if (!fileGroups.has(parentFolder)) {
        fileGroups.set(parentFolder, []);
      }
      fileGroups.get(parentFolder)?.push(file);
    }

    // Process frontmatter first
    const frontmatterFile = files.find(file => 
      file.name.toLowerCase().includes('kata pengantar')
    );
    
    if (frontmatterFile) {
      const content = await frontmatterFile.text();
      addChapter({
        id: crypto.randomUUID(),
        title: 'Kata Pengantar',
        content,
        images: [],
        type: 'frontmatter',
        indentation: 0,
        lineSpacing: 1.5,
        subChapters: [],
      });
    }

    // Process chapters
    for (const [folderName, folderFiles] of fileGroups) {
      const chapterMatch = folderName.match(/BAB (\d+) - (.+)/);
      if (!chapterMatch) continue;

      const chapterNumber = parseInt(chapterMatch[1]);
      const chapterTitle = chapterMatch[2];

      // Create chapter
      const chapterId = crypto.randomUUID();
      const subChapters = [];

      // Sort files to ensure correct order
      const sortedFiles = folderFiles.sort((a, b) => a.name.localeCompare(b.name));

      // Process each file in the chapter folder
      for (const file of sortedFiles) {
        const subChapterMatch = file.name.match(/(\d+\.\d+)\s+(.+)\.txt$/);
        if (!subChapterMatch) continue;

        const content = await file.text();
        subChapters.push({
          id: crypto.randomUUID(),
          title: subChapterMatch[2],
          content,
        });
      }

      if (subChapters.length > 0) {
        addChapter({
          id: chapterId,
          title: chapterTitle,
          content: '',
          images: [],
          type: 'chapter',
          indentation: 0,
          lineSpacing: 1.5,
          subChapters,
        });
      }
    }

    // Process backmatter last
    const backmatterFile = files.find(file => 
      file.name.toLowerCase().includes('penutup')
    );
    
    if (backmatterFile) {
      const content = await backmatterFile.text();
      addChapter({
        id: crypto.randomUUID(),
        title: 'Penutup',
        content,
        images: [],
        type: 'backmatter',
        indentation: 0,
        lineSpacing: 1.5,
        subChapters: [],
      });
    }

    // Reset input
    e.target.value = '';
  };

  const buttonClass = "w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";

  // Group chapters by type
  const frontmatterChapters = chapters.filter(ch => ch.type === 'frontmatter');
  const mainChapters = chapters.filter(ch => ch.type === 'chapter');
  const backmatterChapters = chapters.filter(ch => ch.type === 'backmatter');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Daftar Konten</h3>
        <p className="mt-1 text-sm text-gray-500">
          Kelola konten buku Anda termasuk kata pengantar, bab-bab, dan penutup.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className={buttonClass + " cursor-pointer"}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Semua File
          <input
            type="file"
            className="hidden"
            webkitdirectory="true"
            directory=""
            multiple
            onChange={handleBulkUpload}
          />
        </label>

        <button
          onClick={() => handleAddChapter('frontmatter')}
          className={buttonClass}
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Kata Pengantar
        </button>

        <button
          onClick={() => handleAddChapter('chapter')}
          className={buttonClass}
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Bab
        </button>

        <button
          onClick={() => handleAddChapter('backmatter')}
          className={buttonClass}
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Penutup
        </button>
      </div>

      <div className="space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={chapters.map((chapter) => chapter.id)}
            strategy={verticalListSortingStrategy}
          >
            {/* Render frontmatter chapters first */}
            {frontmatterChapters.map((chapter) => (
              <ChapterItem
                key={chapter.id}
                chapter={chapter}
                index={chapters.indexOf(chapter)}
                isExpanded={false}
                onToggleExpand={() => {}}
              />
            ))}

            {/* Render main chapters with automatic numbering */}
            {mainChapters.map((chapter, index) => (
              <ChapterItem
                key={chapter.id}
                chapter={{ ...chapter, pageNumber: index + 1 }}
                index={chapters.indexOf(chapter)}
                isExpanded={false}
                onToggleExpand={() => {}}
              />
            ))}

            {/* Render backmatter chapters last */}
            {backmatterChapters.map((chapter) => (
              <ChapterItem
                key={chapter.id}
                chapter={chapter}
                index={chapters.indexOf(chapter)}
                isExpanded={false}
                onToggleExpand={() => {}}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}