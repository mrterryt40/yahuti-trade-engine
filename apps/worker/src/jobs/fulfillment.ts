import { Job } from 'bullmq';
import { prisma, TxStatus, InventoryStatus, ListingStatus, DeliveryPolicy, InventoryKind } from '@yahuti/db';
import { createLogger } from '../utils/logger';

const logger = createLogger('Fulfillment');

export interface FulfillmentJobData {
  transactionId?: string;
  batchSize?: number;
  maxDeliveryHours?: number;
  dryRun?: boolean;
}

export interface DeliveryMethod {
  type: 'instant' | 'email' | 'manual' | 'api';
  templateId?: string;
  requiresManualReview: boolean;
  estimatedDeliveryTime: number; // hours
}

export interface FulfillmentResult {
  success: boolean;
  deliveryMethod: string;
  deliveredAt?: Date;
  customerMessage?: string;
  trackingInfo?: string;
  error?: string;
}

export interface DeliveryTemplate {
  subject: string;
  body: string;
  attachments?: string[];
  followUpRequired: boolean;
}

// Delivery templates for different inventory types
const DELIVERY_TEMPLATES: Record<InventoryKind, DeliveryTemplate> = {
  'KEY': {
    subject: '🎮 Your {gameTitle} Game Key - Ready to Play!',
    body: `Hi {buyerName},

Thank you for your purchase! Your {gameTitle} game key is ready for activation.

🔑 **YOUR GAME KEY:**
{deliveryData}

📋 **ACTIVATION INSTRUCTIONS:**
1. Open {platform} application
2. Go to "Activate a Product" or "Add a Game"
3. Enter the key exactly as shown above
4. Download and enjoy your game!

⚠️ **IMPORTANT:**
- This key can only be activated once
- Keep this email for your records
- Contact us immediately if you have any issues

🎯 **SYSTEM REQUIREMENTS:**
Please ensure your system meets the minimum requirements for this game.

💬 **NEED HELP?**
If you experience any issues, please contact us within 24 hours with:
- Your order number: {orderId}
- Screenshot of any error messages
- Your {platform} username

Thank you for choosing us! Please leave positive feedback if you're satisfied.

Best regards,
Yahuti Trade Engine Team`,
    attachments: [],
    followUpRequired: false,
  },
  'ACCOUNT': {
    subject: '🎯 Your {serviceTitle} Account Details - Access Ready!',
    body: `Hi {buyerName},

Your {serviceTitle} account is ready! Please find the login details below.

🔐 **ACCOUNT INFORMATION:**
{deliveryData}

🛡️ **IMPORTANT SECURITY STEPS:**
1. Login immediately using the details above
2. Change the password to something secure
3. Enable 2-factor authentication if available
4. Update the recovery email to yours

⚠️ **ACCOUNT USAGE GUIDELINES:**
- Don't share these details with others
- Use the account responsibly
- Don't violate the service's Terms of Service
- Account sharing may result in suspension

📞 **SUPPORT:**
- Order ID: {orderId}
- Account Level: {accountLevel}
- Region: {region}
- Support valid for 7 days after purchase

If you have any issues accessing the account, contact us within 24 hours.

⭐ **FEEDBACK:**
Please leave positive feedback if everything works correctly!

Best regards,
Yahuti Trade Engine Team

*Disclaimer: This account may violate the original service's ToS. Use at your own discretion.*`,
    attachments: [],
    followUpRequired: true,
  },
  'DOMAIN': {
    subject: '🌐 Domain Transfer Instructions - {domainName}',
    body: `Hi {buyerName},

Thank you for purchasing {domainName}! Here are your transfer instructions.

🔄 **TRANSFER DETAILS:**
{deliveryData}

📋 **TRANSFER PROCESS:**
1. Login to your domain registrar account
2. Initiate a domain transfer
3. Enter the authorization code provided above
4. Confirm the transfer request
5. Transfer typically completes in 5-7 days

📞 **SUPPORT INCLUDED:**
- Transfer assistance for 60 days
- Email support: domains@yahuti-trade.com
- Response time: Within 24 hours

⚠️ **IMPORTANT NOTES:**
- Domain must be transferred within 30 days
- Transfer fees (if any) are covered by buyer
- Domain will remain active during transfer
- You'll receive confirmation once transfer completes

📊 **DOMAIN INFORMATION:**
- Domain: {domainName}
- Registrar: {currentRegistrar}
- Expiry Date: {expiryDate}
- Age: {domainAge}

Need help with the transfer? Reply to this email with your questions.

Best regards,
Yahuti Trade Engine Team`,
    attachments: [],
    followUpRequired: true,
  },
  'GIFTCARD': {
    subject: '🎁 Your {brand} Gift Card - ${amount} Ready to Use!',
    body: `Hi {buyerName},

Your {brand} gift card is ready to use!

💳 **GIFT CARD DETAILS:**
{deliveryData}

🛍️ **HOW TO REDEEM:**
1. Visit {brand} website or store
2. Add items to your cart
3. At checkout, select "Gift Card" payment
4. Enter your gift card code
5. Complete your purchase!

ℹ️ **GIFT CARD INFO:**
- Brand: {brand}
- Value: ${amount}
- Valid Until: {expiryDate}
- Balance Check: Available on {brand} website

⚠️ **IMPORTANT:**
- Treat this code like cash - don't share it
- Screenshot this email for your records
- Use the full balance or it may be lost
- No refunds after redemption

🔒 **SECURITY:**
This gift card was purchased from authorized retailers and is guaranteed valid.

💬 **QUESTIONS?**
Contact us if you have any issues:
- Order ID: {orderId}
- Purchase Date: {purchaseDate}

Enjoy your shopping!

Best regards,
Yahuti Trade Engine Team`,
    attachments: [],
    followUpRequired: false,
  },
  'SUBSCRIPTION': {
    subject: '🚀 Your {serviceTitle} Premium Access - Ready!',
    body: `Hi {buyerName},

Your {serviceTitle} premium subscription is active!

🔐 **LOGIN DETAILS:**
{deliveryData}

🚀 **PREMIUM FEATURES UNLOCKED:**
{featureList}

📱 **GETTING STARTED:**
1. Login with the details above
2. Explore your premium features
3. Download mobile apps if available
4. Enjoy unlimited access!

⏰ **SUBSCRIPTION INFO:**
- Service: {serviceTitle}
- Duration: {duration}
- Access Level: Premium/Pro
- Shared Account: Yes

⚠️ **USAGE GUIDELINES:**
- Don't change account password
- Don't share with others outside your use
- Use responsibly per service ToS
- Don't modify account recovery settings

🔧 **SUPPORT:**
- Valid for duration of subscription
- Email: subscriptions@yahuti-trade.com
- Order ID: {orderId}

If login doesn't work within 2 hours, contact us immediately.

Enjoy your premium access!

Best regards,
Yahuti Trade Engine Team`,
    attachments: [],
    followUpRequired: true,
  },
};

export async function fulfillmentJob(job: Job<FulfillmentJobData>) {
  const {
    transactionId,
    batchSize = 50,
    maxDeliveryHours = 48,
    dryRun = false
  } = job.data;

  logger.info('Starting fulfillment job', {
    transactionId,
    batchSize,
    maxDeliveryHours,
    dryRun,
  });

  try {
    let transactions;
    let totalTransactions;

    if (transactionId) {
      // Fulfill specific transaction
      const transaction = await prisma.transaction.findUnique({
        where: { 
          id: transactionId,
          status: 'PAID',
        },
        include: { inventory: true },
      });

      if (!transaction) {
        throw new Error(`Paid transaction ${transactionId} not found`);
      }

      transactions = [transaction];
      totalTransactions = 1;
    } else {
      // Fulfill batch of paid transactions
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - maxDeliveryHours);

      transactions = await prisma.transaction.findMany({
        where: {
          status: 'PAID',
          createdAt: { gte: cutoffDate }, // Don't fulfill very old transactions automatically
        },
        include: { inventory: true },
        take: batchSize,
        orderBy: { createdAt: 'asc' }, // FIFO fulfillment
      });
      totalTransactions = transactions.length;
    }

    if (transactions.length === 0) {
      logger.info('No transactions to fulfill');
      return {
        success: true,
        totalTransactions: 0,
        fulfilled: 0,
        failed: 0,
        requiresManualReview: 0,
        dryRun,
      };
    }

    logger.info(`Found ${transactions.length} transactions to fulfill`);

    // Update job progress
    await job.updateProgress(10);

    let fulfilledCount = 0;
    let failedCount = 0;
    let manualReviewCount = 0;

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      
      logger.info(`Fulfilling transaction ${transaction.id}`, {
        inventoryId: transaction.inventoryId,
        sku: transaction.inventory.sku,
        marketplace: transaction.marketplace,
        salePrice: transaction.salePrice,
      });

      try {
        // Determine delivery method
        const deliveryMethod = getDeliveryMethod(transaction.inventory);
        
        if (deliveryMethod.requiresManualReview) {
          logger.info(`Transaction ${transaction.id} requires manual review`, {
            sku: transaction.inventory.sku,
            deliveryMethod: deliveryMethod.type,
          });
          
          manualReviewCount++;
          
          if (!dryRun) {
            // Create alert for manual review
            await prisma.alert.create({
              data: {
                severity: 'INFO',
                message: `Manual fulfillment required for ${transaction.inventory.sku}`,
                module: 'fulfillment',
              },
            });
          }
          
          continue;
        }

        // Execute fulfillment
        const fulfillmentResult = await executeFulfillment(transaction, deliveryMethod, dryRun);

        if (fulfillmentResult.success) {
          fulfilledCount++;
          
          if (!dryRun) {
            // Update transaction status
            await prisma.transaction.update({
              where: { id: transaction.id },
              data: {
                status: 'DELIVERED',
                deliveredAt: fulfillmentResult.deliveredAt || new Date(),
                meta: {
                  deliveryMethod: fulfillmentResult.deliveryMethod,
                  trackingInfo: fulfillmentResult.trackingInfo,
                  customerMessage: fulfillmentResult.customerMessage,
                },
              },
            });

            // Update inventory status
            await prisma.inventory.update({
              where: { id: transaction.inventoryId },
              data: { status: 'DELIVERED' },
            });

            // Update listing status to SOLD
            await prisma.listing.updateMany({
              where: { sku: transaction.inventory.sku },
              data: { status: 'SOLD' },
            });
          }

          logger.info(`Transaction ${transaction.id} fulfilled successfully`, {
            deliveryMethod: fulfillmentResult.deliveryMethod,
            deliveredAt: fulfillmentResult.deliveredAt,
          });

        } else {
          failedCount++;
          logger.error(`Failed to fulfill transaction ${transaction.id}: ${fulfillmentResult.error}`);
          
          if (!dryRun) {
            // Log fulfillment failure
            await prisma.ledger.create({
              data: {
                event: 'fulfillment.delivery_failed',
                payloadJson: {
                  transactionId: transaction.id,
                  inventoryId: transaction.inventoryId,
                  sku: transaction.inventory.sku,
                  error: fulfillmentResult.error,
                  timestamp: new Date().toISOString(),
                },
                actor: 'fulfillment',
              },
            });

            // Create critical alert for failed fulfillment
            await prisma.alert.create({
              data: {
                severity: 'CRITICAL',
                message: `Fulfillment failed for transaction ${transaction.id}: ${fulfillmentResult.error}`,
                module: 'fulfillment',
              },
            });
          }
        }

        // Update progress
        const progress = 10 + ((i + 1) / transactions.length) * 85;
        await job.updateProgress(Math.round(progress));

        // Small delay between fulfillments
        await delay(200 + Math.random() * 300);

      } catch (error) {
        failedCount++;
        logger.error(`Error processing transaction ${transaction.id}:`, error);

        if (!dryRun) {
          await prisma.ledger.create({
            data: {
              event: 'fulfillment.processing_error',
              payloadJson: {
                transactionId: transaction.id,
                error: error.message,
                timestamp: new Date().toISOString(),
              },
              actor: 'fulfillment',
            },
          });
        }
      }
    }

    // Log fulfillment summary
    await prisma.ledger.create({
      data: {
        event: 'fulfillment.batch_completed',
        payloadJson: {
          totalTransactions: transactions.length,
          fulfilled: fulfilledCount,
          failed: failedCount,
          manualReview: manualReviewCount,
          fulfillmentRate: transactions.length > 0 ? fulfilledCount / transactions.length : 0,
          dryRun,
          timestamp: new Date().toISOString(),
        },
        actor: 'fulfillment',
      },
    });

    await job.updateProgress(100);

    const result = {
      success: true,
      totalTransactions: transactions.length,
      fulfilled: fulfilledCount,
      failed: failedCount,
      requiresManualReview: manualReviewCount,
      fulfillmentRate: transactions.length > 0 ? fulfilledCount / transactions.length : 0,
      dryRun,
    };

    logger.info('Fulfillment job completed', result);
    return result;

  } catch (error) {
    logger.error('Fulfillment job failed:', error);
    
    // Log failure
    await prisma.ledger.create({
      data: {
        event: 'fulfillment.job_failed',
        payloadJson: {
          transactionId,
          batchSize,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        actor: 'fulfillment',
      },
    });

    throw error;
  }
}

function getDeliveryMethod(inventory: any): DeliveryMethod {
  const kind = inventory.kind as InventoryKind;
  
  // Delivery methods based on inventory type and policy
  const methodMap: Record<InventoryKind, DeliveryMethod> = {
    'KEY': {
      type: inventory.policy === 'INSTANT' ? 'instant' : 'email',
      requiresManualReview: false,
      estimatedDeliveryTime: inventory.policy === 'INSTANT' ? 0.1 : 2,
    },
    'ACCOUNT': {
      type: 'email',
      requiresManualReview: true, // Accounts often need verification
      estimatedDeliveryTime: 4,
    },
    'DOMAIN': {
      type: 'email',
      requiresManualReview: true, // Domain transfers need manual coordination
      estimatedDeliveryTime: 24,
    },
    'GIFTCARD': {
      type: inventory.policy === 'INSTANT' ? 'instant' : 'email',
      requiresManualReview: false,
      estimatedDeliveryTime: inventory.policy === 'INSTANT' ? 0.1 : 1,
    },
    'SUBSCRIPTION': {
      type: 'email',
      requiresManualReview: false,
      estimatedDeliveryTime: 2,
    },
  };

  return methodMap[kind] || {
    type: 'manual',
    requiresManualReview: true,
    estimatedDeliveryTime: 24,
  };
}

async function executeFulfillment(
  transaction: any,
  deliveryMethod: DeliveryMethod,
  dryRun: boolean
): Promise<FulfillmentResult> {
  const inventory = transaction.inventory;
  
  try {
    switch (deliveryMethod.type) {
      case 'instant':
        return await executeInstantDelivery(transaction, dryRun);
      case 'email':
        return await executeEmailDelivery(transaction, dryRun);
      case 'api':
        return await executeApiDelivery(transaction, dryRun);
      case 'manual':
        throw new Error('Manual delivery method should not reach this point');
      default:
        throw new Error(`Unknown delivery method: ${deliveryMethod.type}`);
    }
  } catch (error) {
    return {
      success: false,
      deliveryMethod: deliveryMethod.type,
      error: error.message,
    };
  }
}

async function executeInstantDelivery(transaction: any, dryRun: boolean): Promise<FulfillmentResult> {
  // Simulate instant delivery (e.g., API callback to marketplace)
  logger.info(`Executing instant delivery for transaction ${transaction.id}`);
  
  if (!dryRun) {
    // In reality, this would call the marketplace API to deliver the product
    await delay(100 + Math.random() * 200);
    
    // Simulate occasional delivery failures
    if (Math.random() < 0.02) {
      throw new Error('API delivery service temporarily unavailable');
    }
  }

  const deliveryData = generateDeliveryData(transaction.inventory);
  
  return {
    success: true,
    deliveryMethod: 'instant',
    deliveredAt: new Date(),
    customerMessage: `Your ${transaction.inventory.sku} has been delivered instantly via marketplace messaging.`,
    trackingInfo: `INSTANT_${Date.now()}`,
  };
}

async function executeEmailDelivery(transaction: any, dryRun: boolean): Promise<FulfillmentResult> {
  logger.info(`Executing email delivery for transaction ${transaction.id}`);
  
  const template = DELIVERY_TEMPLATES[transaction.inventory.kind as InventoryKind];
  const deliveryData = generateDeliveryData(transaction.inventory);
  
  // Generate personalized email
  const emailSubject = template.subject
    .replace('{gameTitle}', extractGameTitle(transaction.inventory.sku))
    .replace('{serviceTitle}', extractServiceTitle(transaction.inventory.sku))
    .replace('{domainName}', extractDomainName(transaction.inventory.sku))
    .replace('{brand}', extractBrand(transaction.inventory.sku));

  const emailBody = template.body
    .replace(/{deliveryData}/g, deliveryData)
    .replace(/{buyerName}/g, transaction.buyerId || 'Valued Customer')
    .replace(/{orderId}/g, transaction.id.slice(0, 8))
    .replace(/{gameTitle}/g, extractGameTitle(transaction.inventory.sku))
    .replace(/{platform}/g, extractPlatform(transaction.inventory.sku))
    .replace(/{serviceTitle}/g, extractServiceTitle(transaction.inventory.sku))
    .replace(/{domainName}/g, extractDomainName(transaction.inventory.sku))
    .replace(/{brand}/g, extractBrand(transaction.inventory.sku))
    .replace(/{amount}/g, extractAmount(transaction.inventory.sku))
    .replace(/{featureList}/g, generateFeatureList(transaction.inventory.kind))
    .replace(/{accountLevel}/g, 'Premium')
    .replace(/{region}/g, 'Global')
    .replace(/{duration}/g, '1 month')
    .replace(/{expiryDate}/g, 'No expiry')
    .replace(/{purchaseDate}/g, new Date().toLocaleDateString());

  if (!dryRun) {
    // In reality, this would send an actual email
    await delay(500 + Math.random() * 1000);
    
    // Simulate occasional email delivery failures
    if (Math.random() < 0.01) {
      throw new Error('Email service temporarily unavailable');
    }

    logger.info(`Email sent for transaction ${transaction.id}`, {
      subject: emailSubject,
      deliveryData: deliveryData.substring(0, 50) + '...',
    });
  }

  return {
    success: true,
    deliveryMethod: 'email',
    deliveredAt: new Date(),
    customerMessage: emailBody.substring(0, 200) + '...',
    trackingInfo: `EMAIL_${Date.now()}`,
  };
}

async function executeApiDelivery(transaction: any, dryRun: boolean): Promise<FulfillmentResult> {
  logger.info(`Executing API delivery for transaction ${transaction.id}`);
  
  if (!dryRun) {
    // Simulate API delivery
    await delay(800 + Math.random() * 1200);
    
    // Simulate API failures
    if (Math.random() < 0.03) {
      throw new Error('External API timeout');
    }
  }

  return {
    success: true,
    deliveryMethod: 'api',
    deliveredAt: new Date(),
    customerMessage: 'Product delivered via API integration',
    trackingInfo: `API_${Date.now()}`,
  };
}

function generateDeliveryData(inventory: any): string {
  const kind = inventory.kind as InventoryKind;
  
  switch (kind) {
    case 'KEY':
      return `Game Key: ${generateGameKey()}
Platform: Steam/PC
Region: Global
Instructions: Copy this key and activate it in your Steam client.`;

    case 'ACCOUNT':
      return `Username: ${generateUsername()}
Password: ${generatePassword()}
Email: ${generateEmail()}
Security Question: What is your favorite color?
Security Answer: Blue

IMPORTANT: Change password immediately after login!`;

    case 'DOMAIN':
      const domain = extractDomainName(inventory.sku);
      return `Domain: ${domain}
Authorization Code: ${generateAuthCode()}
Current Registrar: Example Registrar Inc.
Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}

Please initiate transfer within 30 days.`;

    case 'GIFTCARD':
      return `Gift Card Code: ${generateGiftCardCode()}
PIN (if required): ${generatePIN()}
Value: $${extractAmount(inventory.sku)}
Expiry: No expiration date

Instructions: Enter this code at checkout on the merchant's website.`;

    case 'SUBSCRIPTION':
      return `Username: ${generateUsername()}
Password: ${generatePassword()}
Subscription Level: Premium
Valid Until: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}

IMPORTANT: Do not change account credentials!`;

    default:
      return 'Product delivery information not available. Contact support.';
  }
}

// Helper functions for generating mock delivery data
function generateGameKey(): string {
  const segments = 5;
  const segmentLength = 5;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  const key = Array.from({ length: segments }, () =>
    Array.from({ length: segmentLength }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('')
  ).join('-');
  
  return key;
}

function generateUsername(): string {
  const adjectives = ['Quick', 'Silent', 'Brave', 'Swift', 'Noble', 'Wise'];
  const nouns = ['Wolf', 'Eagle', 'Tiger', 'Dragon', 'Phoenix', 'Lion'];
  const numbers = Math.floor(Math.random() * 999) + 1;
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adj}${noun}${numbers}`;
}

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  return Array.from({ length: 12 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
}

function generateEmail(): string {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
  const username = generateUsername().toLowerCase();
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${username}@${domain}`;
}

function generateAuthCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 16 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
}

function generateGiftCardCode(): string {
  const segments = 4;
  const segmentLength = 4;
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  return Array.from({ length: segments }, () =>
    Array.from({ length: segmentLength }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('')
  ).join('-');
}

function generatePIN(): string {
  return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

// Helper functions from merchant.ts (extracted for reuse)
function extractGameTitle(sku: string): string {
  const parts = sku.split('-');
  return parts.length > 1 ? parts[1].replace(/_/g, ' ') : 'Unknown Game';
}

function extractServiceTitle(sku: string): string {
  const parts = sku.split('-');
  return parts.length > 1 ? parts[1].replace(/_/g, ' ') : 'Premium Service';
}

function extractDomainName(sku: string): string {
  const parts = sku.split('-');
  return parts.length > 1 ? parts[1].toLowerCase() + '.com' : 'example.com';
}

function extractBrand(sku: string): string {
  const parts = sku.split('-');
  return parts.length > 1 ? parts[1] : 'Popular Brand';
}

function extractAmount(sku: string): string {
  const match = sku.match(/\d+/);
  return match ? match[0] : '25';
}

function extractPlatform(sku: string): string {
  if (sku.includes('STEAM')) return 'Steam';
  if (sku.includes('XBOX')) return 'Xbox';
  if (sku.includes('PSN')) return 'PlayStation';
  return 'PC';
}

function generateFeatureList(kind: InventoryKind): string {
  const features = {
    'KEY': '- Full game access\n- All DLC included\n- Lifetime ownership',
    'ACCOUNT': '- All progress preserved\n- Premium features unlocked\n- Clean history',
    'DOMAIN': '- Full ownership transfer\n- SEO value included\n- Professional support',
    'GIFTCARD': '- No expiry date\n- Works nationwide\n- Instant activation',
    'SUBSCRIPTION': '- All premium features\n- Multi-device access\n- Priority support',
  };
  
  return features[kind] || '- Premium access\n- Full features\n- Customer support';
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to get fulfillment statistics
export async function getFulfillmentStats(days: number = 30): Promise<{
  totalFulfilled: number;
  avgDeliveryTime: number; // hours
  fulfillmentRate: number;
  manualReviewRate: number;
  topDeliveryMethods: Array<{ method: string; count: number }>;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [totalTransactions, deliveredTransactions] = await Promise.all([
    prisma.transaction.count({
      where: { createdAt: { gte: startDate } },
    }),
    prisma.transaction.findMany({
      where: { 
        createdAt: { gte: startDate },
        status: 'DELIVERED',
        deliveredAt: { not: null },
      },
      select: {
        createdAt: true,
        deliveredAt: true,
        meta: true,
      },
    }),
  ]);

  const totalFulfilled = deliveredTransactions.length;
  
  // Calculate average delivery time
  let totalDeliveryTime = 0;
  const deliveryMethods = new Map<string, number>();

  for (const tx of deliveredTransactions) {
    if (tx.deliveredAt) {
      const deliveryTime = (tx.deliveredAt.getTime() - tx.createdAt.getTime()) / (1000 * 60 * 60); // hours
      totalDeliveryTime += deliveryTime;
    }

    // Count delivery methods
    const method = (tx.meta as any)?.deliveryMethod || 'unknown';
    deliveryMethods.set(method, (deliveryMethods.get(method) || 0) + 1);
  }

  const avgDeliveryTime = totalFulfilled > 0 ? totalDeliveryTime / totalFulfilled : 0;
  const fulfillmentRate = totalTransactions > 0 ? totalFulfilled / totalTransactions : 0;

  // Get manual review count
  const manualReviewCount = await prisma.alert.count({
    where: {
      createdTs: { gte: startDate },
      message: { contains: 'Manual fulfillment required' },
    },
  });

  const manualReviewRate = totalTransactions > 0 ? manualReviewCount / totalTransactions : 0;

  const topDeliveryMethods = Array.from(deliveryMethods.entries())
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalFulfilled,
    avgDeliveryTime: Math.round(avgDeliveryTime * 10) / 10,
    fulfillmentRate: Math.round(fulfillmentRate * 1000) / 1000,
    manualReviewRate: Math.round(manualReviewRate * 1000) / 1000,
    topDeliveryMethods,
  };
}