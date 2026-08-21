import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationService) {}

  @Cron('0 * * * *')
  async processDueReminders() {
    const now = new Date(); const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const reminders = await this.prisma.reminder.findMany({ where:{enabled:true,document:{archivedAt:null,reminderEnabled:true,expiryDate:{not:null,gte:today}}}, include:{document:{include:{owner:true,createdBy:true}}} });
    for(const reminder of reminders){
      const expiry=reminder.document.expiryDate!; const due=new Date(expiry); due.setUTCDate(due.getUTCDate()-reminder.daysBefore); const dueDay=new Date(Date.UTC(due.getUTCFullYear(),due.getUTCMonth(),due.getUTCDate())); if(dueDay.getTime()!==today.getTime())continue;
      const claim=await this.prisma.reminder.updateMany({where:{id:reminder.id,lastSentAt:null},data:{lastSentAt:now}}); if(claim.count!==1)continue;
      const recipient=reminder.document.owner?.email??reminder.document.createdBy.email; const subject=`Expiry reminder: ${reminder.document.title}`;
      try{
        const delivery=await this.prisma.notificationDelivery.upsert({where:{reminderId:reminder.id},create:{reminderId:reminder.id,documentId:reminder.documentId,recipientEmail:recipient,subject,status:'PENDING',attempts:1},update:{attempts:{increment:1},recipientEmail:recipient,subject,status:'PENDING',lastError:null}});
        if(delivery.status==='SENT')continue;
        await this.notifications.sendExpiryReminder({to:recipient,subject,documentTitle:reminder.document.title,expiryDate:expiry,daysBefore:reminder.daysBefore});
        await this.prisma.$transaction([this.prisma.notificationDelivery.update({where:{id:delivery.id},data:{status:'SENT',sentAt:now,lastError:null}}),this.prisma.auditLog.create({data:{action:'NOTIFICATION_SENT',entity:'NotificationDelivery',entityId:delivery.id,metadata:{documentId:reminder.documentId,reminderId:reminder.id,recipientEmail:recipient}}})]);
      }catch(error){
        await this.prisma.$transaction([this.prisma.reminder.update({where:{id:reminder.id},data:{lastSentAt:null}}),this.prisma.notificationDelivery.upsert({where:{reminderId:reminder.id},create:{reminderId:reminder.id,documentId:reminder.documentId,recipientEmail:recipient,subject,status:'FAILED',attempts:1,lastError:String(error)},update:{status:'FAILED',lastError:String(error)}}),this.prisma.auditLog.create({data:{action:'NOTIFICATION_FAILED',entity:'Reminder',entityId:reminder.id,metadata:{documentId:reminder.documentId,error:String(error)}}})]);
        this.logger.error(`Reminder notification failed for ${reminder.documentId}`, error instanceof Error?error.stack:undefined);
      }
    }
  }
}
