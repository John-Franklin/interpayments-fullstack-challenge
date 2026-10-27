using Microsoft.EntityFrameworkCore;

namespace InterPayments.Payments.Web.Api.Data;

public sealed class PaymentsDbContext(DbContextOptions<PaymentsDbContext> options) : DbContext(options)
{
    #region Public Properties

    public DbSet<Merchant> Merchants => Set<Merchant>();

    public DbSet<Payment> Payments => Set<Payment>();

    #endregion


    #region Model Configuration

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Merchant>().ConfigureTable();
        modelBuilder.Entity<Payment>().ConfigureTable();
    }

    #endregion
}
