/**
 * CSCustomCharts - Custom Chart Library for CS Test Reports
 * A lightweight, feature-rich charting library built from scratch
 */

export interface ChartData {
    labels: string[];
    datasets: Dataset[];
}

export interface Dataset {
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    tension?: number;
    fill?: boolean;
}

export interface ChartOptions {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    animation?: {
        duration?: number;
        easing?: string;
    };
    plugins?: {
        legend?: {
            display?: boolean;
            position?: 'top' | 'bottom' | 'left' | 'right';
            labels?: {
                padding?: number;
                usePointStyle?: boolean;
                font?: {
                    size?: number;
                    weight?: string;
                };
            };
        };
        tooltip?: {
            enabled?: boolean;
            callbacks?: {
                label?: (context: any) => string;
            };
        };
        datalabels?: {
            display?: boolean;
            color?: string;
            font?: {
                size?: number;
                weight?: string;
            };
            formatter?: (value: number, context: any) => string;
        };
    };
    scales?: {
        x?: AxisOptions;
        y?: AxisOptions;
    };
}

export interface AxisOptions {
    display?: boolean;
    title?: {
        display?: boolean;
        text?: string;
    };
    ticks?: {
        maxRotation?: number;
        minRotation?: number;
    };
    grid?: {
        display?: boolean;
        color?: string;
    };
}

export class CSChart {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private type: 'doughnut' | 'pie' | 'bar' | 'line' | 'heatmap' | 'scatter' | 'timeline' | 'bubble';
    private data: ChartData;
    private options: ChartOptions;
    private animationFrame: number = 0;
    private currentAnimation: number = 0;
    private tooltipElement: HTMLDivElement | null = null;
    private hoveredSegment: number = -1;
    private chartArea: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 0, height: 0 };
    private legendArea: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 0, height: 0 };

    constructor(canvas: HTMLCanvasElement, config: {
        type: 'doughnut' | 'pie' | 'bar' | 'line' | 'heatmap' | 'scatter' | 'timeline' | 'bubble';
        data: ChartData;
        options?: ChartOptions;
    }) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.type = config.type;
        this.data = config.data;
        this.options = {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            ...config.options
        };

        // Set canvas size
        this.resizeCanvas();

        // Calculate chart and legend areas
        this.calculateAreas();

        // Setup event listeners
        this.setupEventListeners();

        // Start rendering
        this.render();
    }

    private resizeCanvas(): void {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    private calculateAreas(): void {
        const padding = 20;
        const legendHeight = this.options.plugins?.legend?.display !== false ? 80 : 0; // Increased legend height

        this.chartArea = {
            x: padding,
            y: padding,
            width: this.canvas.width - padding * 2,
            height: this.canvas.height - padding * 2 - legendHeight
        };

        this.legendArea = {
            x: padding,
            y: this.canvas.height - legendHeight,
            width: this.canvas.width - padding * 2,
            height: legendHeight
        };
    }

    private setupEventListeners(): void {
        // Mouse move for hover effects
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.handleMouseMove(x, y);
        });

        // Mouse leave to hide tooltip
        this.canvas.addEventListener('mouseleave', () => {
            this.hideTooltip();
            this.hoveredSegment = -1;
            this.render();
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.calculateAreas();
            this.render();
        });
    }

    private render(): void {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Render based on chart type
        switch (this.type) {
            case 'doughnut':
            case 'pie':
                this.renderDoughnutChart();
                break;
            case 'bar':
                this.renderBarChart();
                break;
            case 'line':
                this.renderLineChart();
                break;
            case 'heatmap':
                this.renderHeatmapChart();
                break;
            case 'scatter':
                this.renderScatterChart();
                break;
            case 'timeline':
                this.renderTimelineChart();
                break;
            case 'bubble':
                this.renderBubbleChart();
                break;
        }

        // Render legend
        if (this.options.plugins?.legend?.display !== false) {
            this.renderLegend();
        }
    }

    private renderDoughnutChart(): void {
        const centerX = this.chartArea.x + this.chartArea.width / 2;
        const centerY = this.chartArea.y + this.chartArea.height / 2;
        const radius = Math.min(this.chartArea.width, this.chartArea.height) / 2 - 20;
        const innerRadius = this.type === 'doughnut' ? radius * 0.5 : 0;

        const dataset = this.data.datasets[0];
        const total = dataset.data.reduce((a, b) => a + b, 0);
        let currentAngle = -Math.PI / 2;

        // Draw segments
        dataset.data.forEach((value, index) => {
            const sliceAngle = (value / total) * Math.PI * 2;
            const endAngle = currentAngle + sliceAngle;

            // Draw segment
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, currentAngle, endAngle);
            this.ctx.arc(centerX, centerY, innerRadius, endAngle, currentAngle, true);
            this.ctx.closePath();

            // Apply color
            const colors = Array.isArray(dataset.backgroundColor) 
                ? dataset.backgroundColor 
                : [dataset.backgroundColor || '#000'];
            this.ctx.fillStyle = colors[index % colors.length];
            
            // Apply hover effect
            if (this.hoveredSegment === index) {
                this.ctx.save();
                this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
                this.ctx.shadowBlur = 10;
                this.ctx.shadowOffsetX = 2;
                this.ctx.shadowOffsetY = 2;
            }
            
            this.ctx.fill();
            
            if (this.hoveredSegment === index) {
                this.ctx.restore();
            }

            // Draw border
            if (dataset.borderWidth) {
                this.ctx.strokeStyle = Array.isArray(dataset.borderColor) 
                    ? dataset.borderColor[index % dataset.borderColor.length]
                    : dataset.borderColor || '#fff';
                this.ctx.lineWidth = dataset.borderWidth;
                this.ctx.stroke();
            }

            // Draw data labels
            if (this.options.plugins?.datalabels?.display !== false) {
                const labelAngle = currentAngle + sliceAngle / 2;
                const labelX = centerX + Math.cos(labelAngle) * (radius - (radius - innerRadius) / 2);
                const labelY = centerY + Math.sin(labelAngle) * (radius - (radius - innerRadius) / 2);

                const percentage = ((value / total) * 100).toFixed(1) + '%';
                
                this.ctx.fillStyle = this.options.plugins?.datalabels?.color || '#fff';
                this.ctx.font = `${this.options.plugins?.datalabels?.font?.weight || 'bold'} ${this.options.plugins?.datalabels?.font?.size || 14}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(percentage, labelX, labelY);
            }

            currentAngle = endAngle;
        });
    }

    private renderBarChart(): void {
        const dataset = this.data.datasets[0];
        const barWidth = this.chartArea.width / this.data.labels.length * 0.7;
        const barSpacing = this.chartArea.width / this.data.labels.length * 0.3;
        const maxValue = Math.max(...dataset.data);
        const bottomMargin = 60; // Increased for label space

        // Draw grid lines
        this.drawGrid(maxValue);

        // Draw bars
        dataset.data.forEach((value, index) => {
            const barHeight = (value / maxValue) * (this.chartArea.height - bottomMargin);
            const x = this.chartArea.x + index * (barWidth + barSpacing) + barSpacing / 2;
            const y = this.chartArea.y + this.chartArea.height - barHeight - bottomMargin + 20; // Adjust for bottom margin

            // Draw bar
            this.ctx.fillStyle = Array.isArray(dataset.backgroundColor)
                ? dataset.backgroundColor[index % dataset.backgroundColor.length]
                : dataset.backgroundColor || '#3b82f6';
            
            // Apply hover effect
            if (this.hoveredSegment === index) {
                this.ctx.save();
                this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
                this.ctx.shadowBlur = 5;
            }
            
            this.ctx.fillRect(x, y, barWidth, barHeight);
            
            if (this.hoveredSegment === index) {
                this.ctx.restore();
            }

            // Draw value on top of bar
            if (this.options.plugins?.datalabels?.display !== false) {
                this.ctx.fillStyle = '#666';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(value.toString(), x + barWidth / 2, y - 5);
            }

            // Draw label
            this.ctx.fillStyle = '#666';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.save();
            this.ctx.translate(x + barWidth / 2, this.chartArea.y + this.chartArea.height - bottomMargin + 15);
            this.ctx.rotate(-Math.PI / 3); // Less rotation
            const label = this.data.labels[index];
            const truncatedLabel = label.length > 12 ? label.substring(0, 12) + '..' : label;
            this.ctx.fillText(truncatedLabel, 0, 0);
            this.ctx.restore();
        });
    }

    private renderLineChart(): void {
        const dataset = this.data.datasets[0];
        const pointSpacing = this.chartArea.width / (this.data.labels.length - 1);
        const maxValue = Math.max(...dataset.data);

        // Draw grid
        this.drawGrid(maxValue);

        // Draw line
        this.ctx.beginPath();
        this.ctx.strokeStyle = dataset.borderColor as string || '#3b82f6';
        this.ctx.lineWidth = dataset.borderWidth || 2;

        const points: { x: number; y: number }[] = [];
        
        dataset.data.forEach((value, index) => {
            const x = this.chartArea.x + index * pointSpacing;
            const y = this.chartArea.y + this.chartArea.height - 40 - (value / maxValue) * (this.chartArea.height - 40);
            
            points.push({ x, y });
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                // Apply tension for smooth curves
                if (dataset.tension && dataset.tension > 0 && index > 0) {
                    const cp1x = points[index - 1].x + pointSpacing * dataset.tension;
                    const cp1y = points[index - 1].y;
                    const cp2x = x - pointSpacing * dataset.tension;
                    const cp2y = y;
                    this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
        });
        
        this.ctx.stroke();

        // Fill area under line if specified
        if (dataset.fill) {
            this.ctx.lineTo(points[points.length - 1].x, this.chartArea.y + this.chartArea.height - 40);
            this.ctx.lineTo(points[0].x, this.chartArea.y + this.chartArea.height - 40);
            this.ctx.closePath();
            this.ctx.fillStyle = dataset.backgroundColor as string || 'rgba(59, 130, 246, 0.1)';
            this.ctx.fill();
        }

        // Draw points
        points.forEach((point, index) => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, this.hoveredSegment === index ? 6 : 4, 0, Math.PI * 2);
            this.ctx.fillStyle = dataset.borderColor as string || '#3b82f6';
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });

        // Draw labels with rotation to prevent overlap
        this.data.labels.forEach((label, index) => {
            const x = this.chartArea.x + index * pointSpacing;
            this.ctx.save();
            this.ctx.translate(x, this.chartArea.y + this.chartArea.height - 25);
            this.ctx.rotate(-Math.PI / 4);
            this.ctx.fillStyle = '#666';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'right';
            const truncatedLabel = label.length > 12 ? label.substring(0, 12) + '..' : label;
            this.ctx.fillText(truncatedLabel, 0, 0);
            this.ctx.restore();
        });
    }

    private drawGrid(maxValue: number): void {
        const gridLines = 5;
        const bottomMargin = 60;

        for (let i = 0; i <= gridLines; i++) {
            const y = this.chartArea.y + (this.chartArea.height - bottomMargin) * (1 - i / gridLines);
            
            // Draw grid line
            this.ctx.beginPath();
            this.ctx.moveTo(this.chartArea.x, y);
            this.ctx.lineTo(this.chartArea.x + this.chartArea.width, y);
            this.ctx.strokeStyle = '#e5e7eb';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            
            // Draw y-axis label
            const value = Math.round((maxValue * i) / gridLines);
            this.ctx.fillStyle = '#666';
            this.ctx.font = '11px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(value.toString(), this.chartArea.x - 10, y + 3);
        }
    }

    private renderLegend(): void {
        const items = this.data.labels;
        const dataset = this.data.datasets[0];
        const itemsPerRow = Math.min(items.length, 4);
        const rows = Math.ceil(items.length / itemsPerRow);
        const itemWidth = this.legendArea.width / itemsPerRow;
        const rowHeight = this.legendArea.height / rows;

        items.forEach((label, index) => {
            const row = Math.floor(index / itemsPerRow);
            const col = index % itemsPerRow;
            const x = this.legendArea.x + col * itemWidth + 10;
            const y = this.legendArea.y + row * rowHeight + rowHeight / 2;

            // Draw color box
            const colors = Array.isArray(dataset.backgroundColor)
                ? dataset.backgroundColor
                : [dataset.backgroundColor || '#000'];
            this.ctx.fillStyle = colors[index % colors.length];
            this.ctx.fillRect(x, y - 6, 12, 12);

            // Draw label text (ensure it's visible)
            this.ctx.fillStyle = '#333';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(label, x + 18, y + 3);
        });
    }

    private handleMouseMove(x: number, y: number): void {
        const previousHovered = this.hoveredSegment;
        this.hoveredSegment = this.getSegmentAtPosition(x, y);
        
        if (previousHovered !== this.hoveredSegment) {
            this.render();
            
            if (this.hoveredSegment >= 0) {
                this.showTooltip(x, y, this.hoveredSegment);
            } else {
                this.hideTooltip();
            }
        }
    }

    private getSegmentAtPosition(x: number, y: number): number {
        if (this.type === 'doughnut' || this.type === 'pie') {
            const centerX = this.chartArea.x + this.chartArea.width / 2;
            const centerY = this.chartArea.y + this.chartArea.height / 2;
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const radius = Math.min(this.chartArea.width, this.chartArea.height) / 2 - 20;
            const innerRadius = this.type === 'doughnut' ? radius * 0.5 : 0;
            
            if (distance >= innerRadius && distance <= radius) {
                const angle = Math.atan2(dy, dx) + Math.PI / 2;
                const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle;
                
                const dataset = this.data.datasets[0];
                const total = dataset.data.reduce((a, b) => a + b, 0);
                let currentAngle = 0;
                
                for (let i = 0; i < dataset.data.length; i++) {
                    const sliceAngle = (dataset.data[i] / total) * Math.PI * 2;
                    if (normalizedAngle >= currentAngle && normalizedAngle < currentAngle + sliceAngle) {
                        return i;
                    }
                    currentAngle += sliceAngle;
                }
            }
        } else if (this.type === 'bar') {
            const barWidth = this.chartArea.width / this.data.labels.length * 0.7;
            const barSpacing = this.chartArea.width / this.data.labels.length * 0.3;
            
            for (let i = 0; i < this.data.labels.length; i++) {
                const barX = this.chartArea.x + i * (barWidth + barSpacing) + barSpacing / 2;
                if (x >= barX && x <= barX + barWidth) {
                    return i;
                }
            }
        } else if (this.type === 'line') {
            const pointSpacing = this.chartArea.width / (this.data.labels.length - 1);
            
            for (let i = 0; i < this.data.labels.length; i++) {
                const pointX = this.chartArea.x + i * pointSpacing;
                if (Math.abs(x - pointX) < 10) {
                    return i;
                }
            }
        }
        
        return -1;
    }

    private showTooltip(x: number, y: number, index: number): void {
        if (!this.tooltipElement) {
            this.tooltipElement = document.createElement('div');
            this.tooltipElement.style.position = 'absolute';
            this.tooltipElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            this.tooltipElement.style.color = 'white';
            this.tooltipElement.style.padding = '8px 12px';
            this.tooltipElement.style.borderRadius = '4px';
            this.tooltipElement.style.fontSize = '12px';
            this.tooltipElement.style.pointerEvents = 'none';
            this.tooltipElement.style.zIndex = '1000';
            document.body.appendChild(this.tooltipElement);
        }
        
        const dataset = this.data.datasets[0];
        const label = this.data.labels[index];
        const value = dataset.data[index];
        
        let tooltipText = `${label}: ${value}`;
        
        if (this.type === 'doughnut' || this.type === 'pie') {
            const total = dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            tooltipText = `${label}: ${value} (${percentage}%)`;
        }
        
        if (this.options.plugins?.tooltip?.callbacks?.label) {
            tooltipText = this.options.plugins.tooltip.callbacks.label({
                label,
                parsed: value,
                dataset,
                datasetIndex: 0,
                dataIndex: index
            });
        }
        
        this.tooltipElement.textContent = tooltipText;
        
        const rect = this.canvas.getBoundingClientRect();
        this.tooltipElement.style.left = `${rect.left + x + 10}px`;
        this.tooltipElement.style.top = `${rect.top + y - 30}px`;
        this.tooltipElement.style.display = 'block';
    }

    private hideTooltip(): void {
        if (this.tooltipElement) {
            this.tooltipElement.style.display = 'none';
        }
    }

    public update(data: ChartData): void {
        this.data = data;
        this.render();
    }

    private renderHeatmapChart(): void {
        const dataset = this.data.datasets[0];
        const rows = this.data.labels.length;
        const cols = Math.min(5, Math.ceil(dataset.data.length / rows)); // Ensure cols is calculated properly
        const cellWidth = this.chartArea.width / cols;
        const cellHeight = (this.chartArea.height - 40) / rows;
        const validData = dataset.data.filter(d => d >= 0);
        const maxValue = validData.length > 0 ? Math.max(...validData) : 100;
        const minValue = validData.length > 0 ? Math.min(...validData) : 0;

        // Draw cells
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const index = row * cols + col;
                const value = dataset.data[index] || 0;
                const x = this.chartArea.x + col * cellWidth;
                const y = this.chartArea.y + row * cellHeight;

                // Skip empty cells (value <= 0)
                if (value <= 0) continue;

                // Use proper colors for pass/fail
                if (value >= 80) {
                    // Passed - Green
                    this.ctx.fillStyle = '#10b981';
                } else if (value >= 50) {
                    // Warning - Yellow
                    this.ctx.fillStyle = '#f59e0b';
                } else {
                    // Failed - Red
                    this.ctx.fillStyle = '#ef4444';
                }

                this.ctx.fillRect(x, y, cellWidth - 2, cellHeight - 2);

                // Draw value text
                this.ctx.fillStyle = value >= 50 ? 'white' : 'white';
                this.ctx.font = '11px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(value.toString(), x + cellWidth / 2, y + cellHeight / 2);
            }
        }

        // Draw labels
        this.data.labels.forEach((label, index) => {
            const y = this.chartArea.y + index * cellHeight + cellHeight / 2;
            this.ctx.fillStyle = '#666';
            this.ctx.font = '11px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(label, this.chartArea.x - 10, y);
        });
    }

    private renderScatterChart(): void {
        const dataset = this.data.datasets[0];
        const maxX = Math.max(...dataset.data.filter((_, i) => i % 2 === 0));
        const maxY = Math.max(...dataset.data.filter((_, i) => i % 2 === 1));

        // Draw grid
        this.drawGrid(maxY);

        // Draw points
        for (let i = 0; i < dataset.data.length; i += 2) {
            const x = this.chartArea.x + (dataset.data[i] / maxX) * this.chartArea.width;
            const y = this.chartArea.y + this.chartArea.height - 40 - (dataset.data[i + 1] / maxY) * (this.chartArea.height - 40);

            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, Math.PI * 2);
            const colors = Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor : [dataset.backgroundColor || '#3b82f6'];
            this.ctx.fillStyle = colors[Math.floor(i/2) % colors.length];
            this.ctx.fill();

            // Draw border
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }

        // Draw axes labels
        this.ctx.fillStyle = '#666';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Duration (ms)', this.chartArea.x + this.chartArea.width / 2, this.chartArea.y + this.chartArea.height - 5);

        this.ctx.save();
        this.ctx.translate(this.chartArea.x - 30, this.chartArea.y + this.chartArea.height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText('Test Count', 0, 0);
        this.ctx.restore();
    }

    private renderTimelineChart(): void {
        const dataset = this.data.datasets[0];
        const barHeight = 30;
        const barSpacing = 10;
        const totalDuration = Math.max(...dataset.data.filter((_, i) => i % 2 === 1));

        // Draw timeline bars
        this.data.labels.forEach((label, index) => {
            const startTime = dataset.data[index * 2] || 0;
            const endTime = dataset.data[index * 2 + 1] || startTime;
            const duration = endTime - startTime;

            const x = this.chartArea.x + (startTime / totalDuration) * this.chartArea.width;
            const width = (duration / totalDuration) * this.chartArea.width;
            const y = this.chartArea.y + index * (barHeight + barSpacing);

            // Draw bar
            const colors = Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor : [dataset.backgroundColor || '#3b82f6'];
            this.ctx.fillStyle = colors[index % colors.length];
            this.ctx.fillRect(x, y, width, barHeight);

            // Draw label
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 11px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'middle';
            const labelText = label.length > 20 ? label.substring(0, 20) + '...' : label;
            this.ctx.fillText(labelText, x + 5, y + barHeight / 2);

            // Draw duration text
            this.ctx.fillStyle = '#666';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`${duration}ms`, x + width - 5, y + barHeight / 2);
        });

        // Draw time axis
        const timeSteps = 5;
        for (let i = 0; i <= timeSteps; i++) {
            const time = (totalDuration * i) / timeSteps;
            const x = this.chartArea.x + (i / timeSteps) * this.chartArea.width;

            this.ctx.strokeStyle = '#e5e7eb';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.chartArea.y);
            this.ctx.lineTo(x, this.chartArea.y + this.data.labels.length * (barHeight + barSpacing));
            this.ctx.stroke();

            this.ctx.fillStyle = '#666';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`${Math.round(time)}ms`, x, this.chartArea.y + this.data.labels.length * (barHeight + barSpacing) + 15);
        }
    }

    private renderBubbleChart(): void {
        const dataset = this.data.datasets[0];
        // Data format: [x, y, radius] for each bubble
        const maxX = Math.max(...dataset.data.filter((_, i) => i % 3 === 0));
        const maxY = Math.max(...dataset.data.filter((_, i) => i % 3 === 1));
        const maxRadius = Math.max(...dataset.data.filter((_, i) => i % 3 === 2));

        // Draw grid
        this.drawGrid(maxY);

        // Draw bubbles
        for (let i = 0; i < dataset.data.length; i += 3) {
            const x = this.chartArea.x + (dataset.data[i] / maxX) * this.chartArea.width;
            const y = this.chartArea.y + this.chartArea.height - 40 - (dataset.data[i + 1] / maxY) * (this.chartArea.height - 40);
            const radius = 5 + (dataset.data[i + 2] / maxRadius) * 25;

            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);

            const colors = Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor : [dataset.backgroundColor || '#3b82f6'];
            const color = colors[Math.floor(i/3) % colors.length];

            // Semi-transparent fill
            this.ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', ', 0.6)');
            this.ctx.fill();

            // Border
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Label in center if bubble is large enough
            if (radius > 15 && this.data.labels[Math.floor(i/3)]) {
                this.ctx.fillStyle = '#333';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                const label = this.data.labels[Math.floor(i/3)];
                const shortLabel = label.length > 8 ? label.substring(0, 8) + '..' : label;
                this.ctx.fillText(shortLabel, x, y);
            }
        }

        // Draw axes labels
        this.ctx.fillStyle = '#666';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Execution Time (ms)', this.chartArea.x + this.chartArea.width / 2, this.chartArea.y + this.chartArea.height - 5);

        this.ctx.save();
        this.ctx.translate(this.chartArea.x - 30, this.chartArea.y + this.chartArea.height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText('Complexity Score', 0, 0);
        this.ctx.restore();
    }

    public destroy(): void {
        if (this.tooltipElement && this.tooltipElement.parentNode) {
            this.tooltipElement.parentNode.removeChild(this.tooltipElement);
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// Export for use in reports
export default CSChart;