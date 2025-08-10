// ========================================
// NotificationLogger - 알림 로그 서비스
// ========================================

import { writeFile, appendFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * 알림 로그 인터페이스
 */
export interface NotificationLog {
  eventId: string;
  eventType: string;
  userId?: string;
  orderId?: string;
  productId?: string;
  cartId?: string;
  notificationType: 'email' | 'sms' | 'email_sms' | 'push';
  recipient: string;
  status: 'sent' | 'failed' | 'pending' | 'retry';
  template: string;
  error?: string;
  sentAt: Date;
  deliveredAt?: Date;
  retryCount?: number;
  metadata?: Record<string, any>;
}

/**
 * 알림 통계 인터페이스
 */
export interface NotificationStats {
  date: string;
  totalSent: number;
  totalFailed: number;
  successRate: number;
  byType: Record<string, { sent: number; failed: number }>;
  byTemplate: Record<string, { sent: number; failed: number }>;
}

/**
 * 알림 로그 서비스
 * 파일 기반 로깅 및 메모리 캐시를 통한 통계 제공
 */
export class NotificationLogger {
  private logDir: string;
  private memoryLogs: NotificationLog[] = [];
  private maxMemoryLogs: number = 1000;

  constructor() {
    this.logDir = process.env.NOTIFICATION_LOG_DIR || path.join(process.cwd(), 'logs', 'notifications');
    this.initializeLogDirectory();
  }

  // ========================================
  // 로그 디렉토리 초기화
  // ========================================

  private async initializeLogDirectory(): Promise<void> {
    try {
      await mkdir(this.logDir, { recursive: true });
      console.log(`📁 [NotificationLogger] 로그 디렉토리 초기화 완료: ${this.logDir}`);
    } catch (error) {
      console.error('❌ [NotificationLogger] 로그 디렉토리 생성 실패:', error);
    }
  }

  // ========================================
  // 로그 기록
  // ========================================

  /**
   * 알림 로그 기록
   */
  async logNotification(log: NotificationLog): Promise<void> {
    try {
      console.log('📝 [NotificationLogger] 알림 로그 기록:', {
        eventType: log.eventType,
        notificationType: log.notificationType,
        status: log.status,
        recipient: log.recipient,
      });

      // 메모리에 로그 추가
      this.addToMemoryLogs(log);

      // 파일에 로그 기록
      await this.writeLogToFile(log);

      // 에러 로그는 별도 파일에 기록
      if (log.status === 'failed' && log.error) {
        await this.writeErrorLog(log);
      }

      console.log('✅ [NotificationLogger] 알림 로그 기록 완료');

    } catch (error) {
      console.error('❌ [NotificationLogger] 로그 기록 실패:', error);
      // 로그 기록 실패해도 원본 프로세스에 영향주지 않음
    }
  }

  /**
   * 배치 로그 기록
   */
  async logNotificationBatch(logs: NotificationLog[]): Promise<void> {
    try {
      console.log(`📝 [NotificationLogger] 배치 로그 기록 (${logs.length}개)`);

      // 병렬로 로그 기록
      await Promise.all(
        logs.map(log => this.logNotification(log))
      );

      console.log('✅ [NotificationLogger] 배치 로그 기록 완료');

    } catch (error) {
      console.error('❌ [NotificationLogger] 배치 로그 기록 실패:', error);
    }
  }

  // ========================================
  // 메모리 로그 관리
  // ========================================

  private addToMemoryLogs(log: NotificationLog): void {
    this.memoryLogs.push(log);

    // 메모리 로그 크기 제한
    if (this.memoryLogs.length > this.maxMemoryLogs) {
      this.memoryLogs = this.memoryLogs.slice(-this.maxMemoryLogs);
    }
  }

  /**
   * 메모리에서 최근 로그 조회
   */
  getRecentLogs(limit: number = 100): NotificationLog[] {
    return this.memoryLogs
      .slice(-limit)
      .reverse(); // 최신순으로 정렬
  }

  /**
   * 특정 조건으로 로그 필터링
   */
  getFilteredLogs(filter: {
    eventType?: string;
    notificationType?: string;
    status?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }, limit: number = 100): NotificationLog[] {
    return this.memoryLogs
      .filter(log => {
        if (filter.eventType && log.eventType !== filter.eventType) return false;
        if (filter.notificationType && log.notificationType !== filter.notificationType) return false;
        if (filter.status && log.status !== filter.status) return false;
        if (filter.userId && log.userId !== filter.userId) return false;
        if (filter.startDate && log.sentAt < filter.startDate) return false;
        if (filter.endDate && log.sentAt > filter.endDate) return false;
        return true;
      })
      .slice(-limit)
      .reverse();
  }

  // ========================================
  // 파일 로그 기록
  // ========================================

  private async writeLogToFile(log: NotificationLog): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logFileName = `notifications-${today}.log`;
    const logFilePath = path.join(this.logDir, logFileName);

    const logEntry = {
      timestamp: new Date().toISOString(),
      ...log,
      sentAt: log.sentAt.toISOString(),
      deliveredAt: log.deliveredAt?.toISOString(),
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      await appendFile(logFilePath, logLine, 'utf8');
    } catch (error) {
      console.error(`파일 로그 기록 실패 (${logFilePath}):`, error);
    }
  }

  private async writeErrorLog(log: NotificationLog): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const errorLogFileName = `notification-errors-${today}.log`;
    const errorLogFilePath = path.join(this.logDir, errorLogFileName);

    const errorEntry = {
      timestamp: new Date().toISOString(),
      eventId: log.eventId,
      eventType: log.eventType,
      notificationType: log.notificationType,
      recipient: log.recipient,
      error: log.error,
      template: log.template,
      retryCount: log.retryCount || 0,
      sentAt: log.sentAt.toISOString(),
      metadata: log.metadata,
    };

    const errorLine = JSON.stringify(errorEntry) + '\n';

    try {
      await appendFile(errorLogFilePath, errorLine, 'utf8');
    } catch (error) {
      console.error(`에러 로그 기록 실패 (${errorLogFilePath}):`, error);
    }
  }

  // ========================================
  // 통계 생성
  // ========================================

  /**
   * 일일 알림 통계 생성
   */
  generateDailyStats(date?: Date): NotificationStats {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];
    
    const dayLogs = this.memoryLogs.filter(log => {
      const logDate = log.sentAt.toISOString().split('T')[0];
      return logDate === dateStr;
    });

    const totalSent = dayLogs.filter(log => log.status === 'sent').length;
    const totalFailed = dayLogs.filter(log => log.status === 'failed').length;
    const successRate = totalSent + totalFailed > 0 ? (totalSent / (totalSent + totalFailed)) * 100 : 0;

    // 타입별 통계
    const byType: Record<string, { sent: number; failed: number }> = {};
    dayLogs.forEach(log => {
      if (!byType[log.notificationType]) {
        byType[log.notificationType] = { sent: 0, failed: 0 };
      }
      
      if (log.status === 'sent') {
        byType[log.notificationType].sent++;
      } else if (log.status === 'failed') {
        byType[log.notificationType].failed++;
      }
    });

    // 템플릿별 통계
    const byTemplate: Record<string, { sent: number; failed: number }> = {};
    dayLogs.forEach(log => {
      if (!byTemplate[log.template]) {
        byTemplate[log.template] = { sent: 0, failed: 0 };
      }
      
      if (log.status === 'sent') {
        byTemplate[log.template].sent++;
      } else if (log.status === 'failed') {
        byTemplate[log.template].failed++;
      }
    });

    return {
      date: dateStr,
      totalSent,
      totalFailed,
      successRate: Number(successRate.toFixed(2)),
      byType,
      byTemplate,
    };
  }

  /**
   * 기간별 통계 생성
   */
  generatePeriodStats(startDate: Date, endDate: Date): NotificationStats[] {
    const stats: NotificationStats[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      stats.push(this.generateDailyStats(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return stats;
  }

  /**
   * 실시간 통계 조회
   */
  getRealTimeStats(): {
    last24Hours: NotificationStats;
    lastHour: {
      sent: number;
      failed: number;
      successRate: number;
    };
    currentErrors: NotificationLog[];
  } {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    // 최근 24시간 통계
    const last24HoursStats = this.generateDailyStats(now);

    // 최근 1시간 통계
    const lastHourLogs = this.memoryLogs.filter(log => log.sentAt >= lastHour);
    const lastHourSent = lastHourLogs.filter(log => log.status === 'sent').length;
    const lastHourFailed = lastHourLogs.filter(log => log.status === 'failed').length;
    const lastHourSuccessRate = lastHourSent + lastHourFailed > 0 
      ? (lastHourSent / (lastHourSent + lastHourFailed)) * 100 
      : 0;

    // 현재 에러 로그들
    const currentErrors = this.memoryLogs
      .filter(log => log.status === 'failed' && log.sentAt >= last24Hours)
      .slice(-10); // 최근 10개 에러

    return {
      last24Hours: last24HoursStats,
      lastHour: {
        sent: lastHourSent,
        failed: lastHourFailed,
        successRate: Number(lastHourSuccessRate.toFixed(2)),
      },
      currentErrors,
    };
  }

  // ========================================
  // 로그 관리
  // ========================================

  /**
   * 오래된 로그 파일 정리
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<void> {
    try {
      console.log(`🧹 [NotificationLogger] ${daysToKeep}일 이전 로그 파일 정리 시작`);

      const fs = await import('fs/promises');
      const files = await fs.readdir(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let deletedCount = 0;

      for (const file of files) {
        if (!file.endsWith('.log')) continue;

        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
          console.log(`🗑️ [NotificationLogger] 삭제된 파일: ${file}`);
        }
      }

      console.log(`✅ [NotificationLogger] 로그 파일 정리 완료 (${deletedCount}개 파일 삭제)`);

    } catch (error) {
      console.error('❌ [NotificationLogger] 로그 파일 정리 실패:', error);
    }
  }

  /**
   * 메모리 로그 초기화
   */
  clearMemoryLogs(): void {
    console.log('🧹 [NotificationLogger] 메모리 로그 초기화');
    this.memoryLogs = [];
  }

  /**
   * 로그 백업
   */
  async backupLogs(backupDir: string): Promise<void> {
    try {
      console.log(`💾 [NotificationLogger] 로그 백업 시작: ${backupDir}`);

      const fs = await import('fs/promises');
      await mkdir(backupDir, { recursive: true });

      const files = await fs.readdir(this.logDir);
      let backupCount = 0;

      for (const file of files) {
        if (!file.endsWith('.log')) continue;

        const sourceFile = path.join(this.logDir, file);
        const backupFile = path.join(backupDir, `${new Date().toISOString().split('T')[0]}_${file}`);

        await fs.copyFile(sourceFile, backupFile);
        backupCount++;
      }

      console.log(`✅ [NotificationLogger] 로그 백업 완료 (${backupCount}개 파일)`);

    } catch (error) {
      console.error('❌ [NotificationLogger] 로그 백업 실패:', error);
      throw error;
    }
  }

  // ========================================
  // 헬스체크
  // ========================================

  /**
   * 로그 시스템 상태 확인
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    memoryLogCount: number;
    diskSpaceUsage: string;
    lastLogTime?: Date;
    errorRate: number;
  }> {
    try {
      const fs = await import('fs/promises');
      const stats = await fs.stat(this.logDir);
      
      const recentLogs = this.getRecentLogs(100);
      const errorLogs = recentLogs.filter(log => log.status === 'failed');
      const errorRate = recentLogs.length > 0 ? (errorLogs.length / recentLogs.length) * 100 : 0;
      
      const lastLogTime = recentLogs.length > 0 ? recentLogs[0].sentAt : undefined;

      return {
        status: errorRate > 50 ? 'unhealthy' : 'healthy',
        memoryLogCount: this.memoryLogs.length,
        diskSpaceUsage: `${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB`,
        lastLogTime,
        errorRate: Number(errorRate.toFixed(2)),
      };

    } catch (error) {
      console.error('로그 시스템 상태 확인 실패:', error);
      return {
        status: 'unhealthy',
        memoryLogCount: this.memoryLogs.length,
        diskSpaceUsage: 'unknown',
        errorRate: 100,
      };
    }
  }
}