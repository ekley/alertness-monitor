export interface Detection {
  class_id: number;
  "class": string;
  confidence: number;
  xyxy: [number, number, number, number];
}
