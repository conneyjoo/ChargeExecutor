import org.junit.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.Assert.assertTrue;

public class ChargeExecutorTest {

    private static final Logger logger = LoggerFactory.getLogger(ChargeExecutorTest.class);

    /* 执行次数 */
    static AtomicInteger executeCount = new AtomicInteger();

    /* 执行任务总数 */
    static AtomicInteger taskCount = new AtomicInteger();

    /* 执行过的任务标记表 */
    static long[] marks;

    public static void verify() {
        logger.info("executeCount: " + executeCount.get());
        logger.info("taskCount: " + taskCount.get());

        for (int i = 0; i < marks.length; i++) {
            if (marks[i] != 1) {
                throw new RuntimeException(String.valueOf(i));
            }
        }
    }

    static class TestTask extends ChargeExecutor.ChargeTask<Long> {

        protected Long value;

        public TestTask(Long value) {
            this.value = value;
        }

        @Override
        public void execute(List<Long> list, boolean filled) {
            StringBuilder builder = new StringBuilder();
            list.forEach(e -> {
                marks[e.intValue()] = 1;
                builder.append(" ").append(e).append(" ");
            });

            logger.info("execute[value = {}, size = {}， filled = {}]: {}", getValue(), list.size(), filled, builder.toString());

            executeCount.incrementAndGet();
            taskCount.accumulateAndGet(list.size(), (l, r) -> l + r);
        }

        @Override
        public Long getValue() {
            return value;
        }
    }

    @Test
    public void test() {
        try {
            long now = System.currentTimeMillis();
            final int threadSize = 20, taskSize = 100000;
            final ChargeExecutor chargeExecutor = new ChargeExecutor(50, 64);
            final CountDownLatch countDownLatch = new CountDownLatch(threadSize);
            final AtomicLong seq = new AtomicLong();

            marks = new long[threadSize * taskSize];

            for (int i = 0; i < threadSize; i++) {
                new Thread(() -> {
                    try {
                        for (int j = 0; j < taskSize; j++) {
                            TestTask task = new TestTask(seq.getAndIncrement());
                            chargeExecutor.execute(task);
                        }
                    } finally {
                        countDownLatch.countDown();
                    }
                }).start();
            }

            countDownLatch.await();
            long duration = System.currentTimeMillis() - now;

            Thread.sleep(1000);

            logger.info("duation: {}", duration);
            verify();

            assertTrue(marks.length == taskCount.get());
        } catch (Exception e) {
            logger.error(e.getMessage(), e);
        }
    }
}
