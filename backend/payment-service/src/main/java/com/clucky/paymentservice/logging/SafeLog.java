package com.clucky.paymentservice.logging;

import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;

public final class SafeLog {
    private SafeLog() {}

    public static String token(String value) {
        return value != null && value.matches("[A-Za-z0-9._:-]{1,160}") ? value : "unknown";
    }

    public static String route(Object pattern) {
        String value = pattern == null ? "unmatched" : pattern.toString();
        return value.length() <= 256 && value.matches("[/A-Za-z0-9_.*{}:-]+") ? value : "unmatched";
    }

    public static String trace(Throwable failure) {
        StringBuilder result = new StringBuilder();
        Set<Throwable> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        int causes = 0;
        while (failure != null && causes++ < 5 && seen.add(failure)) {
            if (!result.isEmpty()) { result.append(" causedBy="); }
            result.append(token(failure.getClass().getName()));
            StackTraceElement[] frames = failure.getStackTrace();
            for (int index = 0; index < Math.min(frames.length, 20); index++) {
                StackTraceElement frame = frames[index];
                result.append(" at ").append(token(frame.getClassName())).append('.')
                        .append(token(frame.getMethodName())).append('(')
                        .append(token(frame.getFileName())).append(':').append(frame.getLineNumber()).append(')');
            }
            failure = failure.getCause();
        }
        return result.toString();
    }
}
