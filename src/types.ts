export type Point = [number, number]
export type Mode = 'strip' | 'bin'
export interface Piece { id: number; typeId: number; polygon: Point[] }
export interface Instance { name: string; width?: number; pieces: Piece[] }
export interface Placement extends Piece { container: number; rotation: number }
export interface Layout { name: string; mode: Mode; width: number; height: number; containers: number; placements: Placement[] }
