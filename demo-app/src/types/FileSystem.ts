export interface FileSystemItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parent?: string;
  children?: string[];
  path: string;
  size?: number;
  modified: Date;
}

export interface FileSystemData {
  [key: string]: FileSystemItem;
}

export const mockFileSystem: FileSystemData = {
  'root': {
    id: 'root',
    name: 'EFS Root',
    type: 'folder',
    path: '/',
    children: ['medical', 'semiconductor', 'shared'],
    modified: new Date('2024-01-15')
  },
  'medical': {
    id: 'medical',
    name: 'Medical Records',
    type: 'folder',
    parent: 'root',
    path: '/medical',
    children: ['patient-data', 'xrays', 'procedures'],
    modified: new Date('2024-01-20')
  },
  'patient-data': {
    id: 'patient-data',
    name: 'Patient Data',
    type: 'folder',
    parent: 'medical',
    path: '/medical/patient-data',
    children: ['patient-001.json', 'patient-002.json', 'patient-003.json'],
    modified: new Date('2024-01-22')
  },
  'patient-001.json': {
    id: 'patient-001.json',
    name: 'Patient 001 Record',
    type: 'file',
    parent: 'patient-data',
    path: '/medical/patient-data/patient-001.json',
    size: 2048,
    modified: new Date('2024-01-22')
  },
  'patient-002.json': {
    id: 'patient-002.json',
    name: 'Patient 002 Record',
    type: 'file',
    parent: 'patient-data',
    path: '/medical/patient-data/patient-002.json',
    size: 1854,
    modified: new Date('2024-01-21')
  },
  'patient-003.json': {
    id: 'patient-003.json',
    name: 'Patient 003 Record',
    type: 'file',
    parent: 'patient-data',
    path: '/medical/patient-data/patient-003.json',
    size: 2156,
    modified: new Date('2024-01-23')
  },
  'xrays': {
    id: 'xrays',
    name: 'X-Ray Images',
    type: 'folder',
    parent: 'medical',
    path: '/medical/xrays',
    children: ['chest-001.dcm', 'leg-002.dcm', 'skull-003.dcm'],
    modified: new Date('2024-01-19')
  },
  'chest-001.dcm': {
    id: 'chest-001.dcm',
    name: 'Chest X-Ray 001',
    type: 'file',
    parent: 'xrays',
    path: '/medical/xrays/chest-001.dcm',
    size: 524288,
    modified: new Date('2024-01-19')
  },
  'leg-002.dcm': {
    id: 'leg-002.dcm',
    name: 'Leg X-Ray 002',
    type: 'file',
    parent: 'xrays',
    path: '/medical/xrays/leg-002.dcm',
    size: 612352,
    modified: new Date('2024-01-18')
  },
  'skull-003.dcm': {
    id: 'skull-003.dcm',
    name: 'Skull X-Ray 003',
    type: 'file',
    parent: 'xrays',
    path: '/medical/xrays/skull-003.dcm',
    size: 498176,
    modified: new Date('2024-01-20')
  },
  'procedures': {
    id: 'procedures',
    name: 'Procedure Documents',
    type: 'folder',
    parent: 'medical',
    path: '/medical/procedures',
    children: ['surgery-protocol.pdf', 'lab-results.pdf'],
    modified: new Date('2024-01-21')
  },
  'surgery-protocol.pdf': {
    id: 'surgery-protocol.pdf',
    name: 'Surgery Protocol',
    type: 'file',
    parent: 'procedures',
    path: '/medical/procedures/surgery-protocol.pdf',
    size: 1048576,
    modified: new Date('2024-01-21')
  },
  'lab-results.pdf': {
    id: 'lab-results.pdf',
    name: 'Lab Results',
    type: 'file',
    parent: 'procedures',
    path: '/medical/procedures/lab-results.pdf',
    size: 786432,
    modified: new Date('2024-01-20')
  },
  'semiconductor': {
    id: 'semiconductor',
    name: 'Semiconductor Designs',
    type: 'folder',
    parent: 'root',
    path: '/semiconductor',
    children: ['chip-designs', 'test-results', 'specifications'],
    modified: new Date('2024-01-18')
  },
  'chip-designs': {
    id: 'chip-designs',
    name: 'Chip Designs',
    type: 'folder',
    parent: 'semiconductor',
    path: '/semiconductor/chip-designs',
    children: ['cpu-v2.cad', 'gpu-prototype.cad', 'memory-controller.cad'],
    modified: new Date('2024-01-17')
  },
  'cpu-v2.cad': {
    id: 'cpu-v2.cad',
    name: 'CPU Design v2',
    type: 'file',
    parent: 'chip-designs',
    path: '/semiconductor/chip-designs/cpu-v2.cad',
    size: 5242880,
    modified: new Date('2024-01-17')
  },
  'gpu-prototype.cad': {
    id: 'gpu-prototype.cad',
    name: 'GPU Prototype',
    type: 'file',
    parent: 'chip-designs',
    path: '/semiconductor/chip-designs/gpu-prototype.cad',
    size: 8388608,
    modified: new Date('2024-01-16')
  },
  'memory-controller.cad': {
    id: 'memory-controller.cad',
    name: 'Memory Controller',
    type: 'file',
    parent: 'chip-designs',
    path: '/semiconductor/chip-designs/memory-controller.cad',
    size: 3145728,
    modified: new Date('2024-01-18')
  },
  'test-results': {
    id: 'test-results',
    name: 'Test Results',
    type: 'folder',
    parent: 'semiconductor',
    path: '/semiconductor/test-results',
    children: ['performance-test.csv', 'thermal-analysis.xlsx'],
    modified: new Date('2024-01-19')
  },
  'performance-test.csv': {
    id: 'performance-test.csv',
    name: 'Performance Test Data',
    type: 'file',
    parent: 'test-results',
    path: '/semiconductor/test-results/performance-test.csv',
    size: 204800,
    modified: new Date('2024-01-19')
  },
  'thermal-analysis.xlsx': {
    id: 'thermal-analysis.xlsx',
    name: 'Thermal Analysis',
    type: 'file',
    parent: 'test-results',
    path: '/semiconductor/test-results/thermal-analysis.xlsx',
    size: 1572864,
    modified: new Date('2024-01-18')
  },
  'specifications': {
    id: 'specifications',
    name: 'Specifications',
    type: 'folder',
    parent: 'semiconductor',
    path: '/semiconductor/specifications',
    children: ['chip-spec-v3.pdf', 'manufacturing-requirements.docx'],
    modified: new Date('2024-01-17')
  },
  'chip-spec-v3.pdf': {
    id: 'chip-spec-v3.pdf',
    name: 'Chip Specification v3',
    type: 'file',
    parent: 'specifications',
    path: '/semiconductor/specifications/chip-spec-v3.pdf',
    size: 2097152,
    modified: new Date('2024-01-17')
  },
  'manufacturing-requirements.docx': {
    id: 'manufacturing-requirements.docx',
    name: 'Manufacturing Requirements',
    type: 'file',
    parent: 'specifications',
    path: '/semiconductor/specifications/manufacturing-requirements.docx',
    size: 1048576,
    modified: new Date('2024-01-16')
  },
  'shared': {
    id: 'shared',
    name: 'Shared Resources',
    type: 'folder',
    parent: 'root',
    path: '/shared',
    children: ['documentation', 'tools'],
    modified: new Date('2024-01-15')
  },
  'documentation': {
    id: 'documentation',
    name: 'Documentation',
    type: 'folder',
    parent: 'shared',
    path: '/shared/documentation',
    children: ['user-manual.pdf', 'api-reference.pdf'],
    modified: new Date('2024-01-14')
  },
  'user-manual.pdf': {
    id: 'user-manual.pdf',
    name: 'User Manual',
    type: 'file',
    parent: 'documentation',
    path: '/shared/documentation/user-manual.pdf',
    size: 3145728,
    modified: new Date('2024-01-14')
  },
  'api-reference.pdf': {
    id: 'api-reference.pdf',
    name: 'API Reference',
    type: 'file',
    parent: 'documentation',
    path: '/shared/documentation/api-reference.pdf',
    size: 1572864,
    modified: new Date('2024-01-13')
  },
  'tools': {
    id: 'tools',
    name: 'Development Tools',
    type: 'folder',
    parent: 'shared',
    path: '/shared/tools',
    children: ['analyzer.exe', 'converter.jar'],
    modified: new Date('2024-01-12')
  },
  'analyzer.exe': {
    id: 'analyzer.exe',
    name: 'Data Analyzer',
    type: 'file',
    parent: 'tools',
    path: '/shared/tools/analyzer.exe',
    size: 10485760,
    modified: new Date('2024-01-12')
  },
  'converter.jar': {
    id: 'converter.jar',
    name: 'Format Converter',
    type: 'file',
    parent: 'tools',
    path: '/shared/tools/converter.jar',
    size: 5242880,
    modified: new Date('2024-01-11')
  }
};